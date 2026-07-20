import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class AuthResponse {
  final String? accessToken;
  final String? refreshToken;
  final String? sessionToken;
  final String? role;
  final String? username;
  final bool otpRequired;
  final String? otpToken;
  final String? message;

  AuthResponse({
    this.accessToken,
    this.refreshToken,
    this.sessionToken,
    this.role,
    this.username,
    this.otpRequired = false,
    this.otpToken,
    this.message,
  });
}

class AuthService {
  static const _storage = FlutterSecureStorage();
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _sessionTokenKey = 'session_token';
  static const _roleKey = 'user_role';
  static const _usernameKey = 'username';

  static const _baseUrl = 'https://192.168.1.203:8443';

  final http.Client _client;
  String _deviceFingerprint = '';

  AuthService({required http.Client client}) : _client = client;

  Future<AuthResponse> login(String username, String password) async {
    _deviceFingerprint = 'flutter-officer-${DateTime.now().millisecondsSinceEpoch}';
    final response = await _client.post(
      Uri.parse('$_baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
        'deviceFingerprint': _deviceFingerprint,
      }),
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      await _storage.write(key: _accessTokenKey, value: body['accessToken']);
      await _storage.write(key: _refreshTokenKey, value: body['refreshToken']);
      await _storage.write(key: _sessionTokenKey, value: body['sessionToken']);
      await _storage.write(key: _roleKey, value: body['role']);
      await _storage.write(key: _usernameKey, value: body['username']);
      return AuthResponse(
        accessToken: body['accessToken'],
        refreshToken: body['refreshToken'],
        sessionToken: body['sessionToken'],
        role: body['role'],
        username: body['username'],
      );
    } else if (response.statusCode == 202) {
      return AuthResponse(
        otpRequired: true,
        otpToken: body['otpToken'],
        message: body['message'],
      );
    } else {
      throw Exception(body['error'] ?? 'Login failed');
    }
  }

  Future<AuthResponse> verifyOtp(String otpToken, String otp) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl/api/auth/otp/verify'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'otpToken': otpToken, 'otp': otp}),
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      await _storage.write(key: _accessTokenKey, value: body['accessToken']);
      await _storage.write(key: _refreshTokenKey, value: body['refreshToken']);
      await _storage.write(key: _sessionTokenKey, value: body['sessionToken']);
      await _storage.write(key: _roleKey, value: body['role']);
      await _storage.write(key: _usernameKey, value: body['username']);
      return AuthResponse(accessToken: body['accessToken'], role: body['role']);
    } else {
      throw Exception(body['error'] ?? 'OTP verification failed');
    }
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);
  Future<String?> getSessionToken() => _storage.read(key: _sessionTokenKey);
  String getDeviceFingerprint() => _deviceFingerprint;

  Future<void> clearSession() async {
    await _storage.deleteAll();
  }
}
