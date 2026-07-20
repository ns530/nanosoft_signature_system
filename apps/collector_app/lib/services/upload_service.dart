import 'dart:async';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class UploadService {
  static const _storage = FlutterSecureStorage();
  static const _queueIndexKey = 'offline_queue_index';
  static const _baseUrl = 'https://192.168.1.203:8443';

  final http.Client _client;

  UploadService({required http.Client client}) : _client = client;

  Future<String> uploadImage({
    required String unlockToken,
    required String customerId,
    required String imageType,
    required List<int> imageBytes,
    required String deviceFingerprint,
  }) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl/api/officer/customer/$customerId/image'),
      headers: {
        'X-Unlock-Token': unlockToken,
        'X-Image-Type': imageType,
        'X-Device-Fingerprint': deviceFingerprint,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBytes,
    );

    if (response.statusCode == 201) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      unawaited(_flushQueue());
      return body['imageId'];
    } else if (response.statusCode == 422 || response.statusCode >= 500) {
      return _queueOffline(unlockToken, customerId, imageType, imageBytes, deviceFingerprint);
    } else {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      throw Exception(body['error'] ?? 'Upload failed');
    }
  }

  Future<String> _queueOffline(
    String unlockToken,
    String customerId,
    String imageType,
    List<int> imageBytes,
    String deviceFingerprint,
  ) async {
    final base64Image = base64Encode(imageBytes);
    final queueItem = {
      'unlockToken': unlockToken,
      'customerId': customerId,
      'imageType': imageType,
      'imageData': base64Image,
      'deviceFingerprint': deviceFingerprint,
      'queuedAt': DateTime.now().toIso8601String(),
    };

    final index = await _nextQueueIndex();
    await _storage.write(key: 'queue_item_$index', value: jsonEncode(queueItem));
    return 'queued';
  }

  Future<int> _nextQueueIndex() async {
    final existing = await _storage.read(key: _queueIndexKey);
    final next = existing != null ? int.parse(existing) + 1 : 0;
    await _storage.write(key: _queueIndexKey, value: next.toString());
    return next;
  }

  Future<List<Map<String, dynamic>>> getQueue() async {
    final indexStr = await _storage.read(key: _queueIndexKey);
    if (indexStr == null) return [];

    final lastIndex = int.parse(indexStr);
    final items = <Map<String, dynamic>>[];

    for (int i = 0; i <= lastIndex; i++) {
      final raw = await _storage.read(key: 'queue_item_$i');
      if (raw != null) {
        items.add(jsonDecode(raw) as Map<String, dynamic>);
      }
    }
    return items;
  }

  Future<void> removeFromQueue(int index) async {
    await _storage.delete(key: 'queue_item_$index');
  }

  Future<void> clearQueue() async {
    final indexStr = await _storage.read(key: _queueIndexKey);
    if (indexStr != null) {
      final lastIndex = int.parse(indexStr);
      for (int i = 0; i <= lastIndex; i++) {
        await _storage.delete(key: 'queue_item_$i');
      }
    }
    await _storage.delete(key: _queueIndexKey);
  }

  Future<void> _flushQueue() async {
    final items = await getQueue();
    if (items.isEmpty) return;
    for (int i = 0; i < items.length; i++) {
      final item = items[i];
      try {
        final response = await _client.post(
          Uri.parse('$_baseUrl/api/officer/customer/${item['customerId']}/image'),
          headers: {
            'X-Unlock-Token': item['unlockToken'] as String,
            'X-Image-Type': item['imageType'] as String,
            'X-Device-Fingerprint': item['deviceFingerprint'] as String,
            'Content-Type': 'application/octet-stream',
          },
          body: base64Decode(item['imageData'] as String),
        );
        if (response.statusCode == 201) {
          await removeFromQueue(i);
        }
      } catch (_) {
        break;
      }
    }
  }
}
