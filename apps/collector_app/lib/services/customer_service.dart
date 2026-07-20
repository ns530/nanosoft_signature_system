import 'dart:convert';
import 'package:http/http.dart' as http;

class CustomerService {
  final http.Client _client;
  static const _baseUrl = 'https://192.168.1.203:8443';

  CustomerService({required http.Client client}) : _client = client;

  Future<Map<String, dynamic>> lookupCustomer(
      String customerId, String unlockToken) async {
    final response = await _client.get(
      Uri.parse('$_baseUrl/api/officer/customer/$customerId'),
      headers: {'X-Unlock-Token': unlockToken},
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      return body;
    } else if (response.statusCode == 404) {
      throw Exception('Customer not found');
    } else {
      throw Exception(body['error'] ?? 'Lookup failed');
    }
  }
}
