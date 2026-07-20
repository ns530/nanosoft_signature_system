import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class QrService {
  final http.Client _client;
  static const _baseUrl = 'https://192.168.1.203:8443';

  QrService({required http.Client client}) : _client = client;

  Future<Map<String, dynamic>> validateQr(String qrToken) async {
    final token = await AuthService(client: _client).getAccessToken();
    if (token == null) throw Exception('Not authenticated');

    final response = await _client.post(
      Uri.parse('$_baseUrl/api/officer/qr/validate'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'qrToken': qrToken}),
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      return body;
    } else {
      throw Exception(body['error'] ?? 'QR validation failed');
    }
  }
}
