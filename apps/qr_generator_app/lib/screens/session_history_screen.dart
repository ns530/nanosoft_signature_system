import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class SessionHistoryScreen extends StatelessWidget {
  final AuthService authService;
  const SessionHistoryScreen({super.key, required this.authService});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recent Sessions')),
      body: const Center(
        child: Text('Session history (placeholder — API endpoint not yet implemented)'),
      ),
    );
  }
}
