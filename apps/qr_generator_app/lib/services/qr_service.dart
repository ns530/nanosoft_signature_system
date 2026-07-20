import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class QrSession {
  final String qrToken;
  final int expiresIn;

  QrSession({required this.qrToken, required this.expiresIn});
}

class QrService {
  final AuthService _authService;
  final http.Client _client;
  static const _baseUrl = 'https://192.168.1.203:8443';

  QrService({required AuthService authService, required http.Client client})
      : _authService = authService,
        _client = client;

  Future<QrSession> generateQr() async {
    final token = await _authService.getAccessToken();
    if (token == null) throw Exception('Not authenticated');

    final response = await _client.post(
      Uri.parse('$_baseUrl/api/admin/qr/generate'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      return QrSession(
        qrToken: body['qrToken'],
        expiresIn: body['expiresIn'] as int,
      );
    } else {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      throw Exception(body['error'] ?? 'QR generation failed');
    }
  }
}
