import 'package:flutter/material.dart';
import '../services/customer_service.dart';
import 'capture_screen.dart';
import '../main.dart' show customerService;

class CustomerLookupScreen extends StatefulWidget {
  final String unlockToken;
  const CustomerLookupScreen({super.key, required this.unlockToken});

  @override
  State<CustomerLookupScreen> createState() => _CustomerLookupScreenState();
}

class _CustomerLookupScreenState extends State<CustomerLookupScreen> {
  final _customerIdCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _customer;

  void _lookup() async {
    setState(() { _loading = true; _error = null; _customer = null; });
    try {
      final result = await customerService.lookupCustomer(
        _customerIdCtrl.text.trim(), widget.unlockToken);
      if (!mounted) return;
      setState(() => _customer = result);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customer Lookup')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            TextField(
              controller: _customerIdCtrl,
              decoration: const InputDecoration(
                labelText: 'Customer ID',
                hintText: 'Enter Customer ID or scan barcode'),
              textInputAction: TextInputAction.go,
              onSubmitted: (_) => _lookup()),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _lookup,
                child: _loading
                    ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Find Customer')),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            if (_customer != null) ...[
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Text('CustomerID: ${_customer!['CustomerID']}',
                          style: const TextStyle(fontSize: 16)),
                      const SizedBox(height: 8),
                      Text('Name: ${_customer!['CustomerName']}',
                          style: const TextStyle(fontSize: 16)),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.camera_alt),
                          label: const Text('Proceed to Capture'),
                          onPressed: () {
                            Navigator.push(context,
                              MaterialPageRoute(builder: (_) =>
                                CaptureScreen(
                                  unlockToken: widget.unlockToken,
                                  customerId: _customer!['CustomerID'],
                                  customerName: _customer!['CustomerName'],
                                )));
                          }),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _customerIdCtrl.dispose();
    super.dispose();
  }
}
