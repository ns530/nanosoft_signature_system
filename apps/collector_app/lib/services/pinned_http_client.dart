import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart' show rootBundle;
import 'package:http/io_client.dart';

/// Returns an [IOClient] whose SecurityContext trusts only the bundled
/// HolcemLK-Local-CA. All other CA certs (including OS system store) are
/// ignored — this is true certificate pinning to our specific self-signed CA.
///
/// Call [loadPinnedHttpClient] once at app startup and pass the returned
/// client to every service that makes HTTPS requests.
Future<IOClient> loadPinnedHttpClient() async {
  final caPem = await rootBundle.loadString('assets/ca-cert.pem');

  final securityContext = SecurityContext(withTrustedRoots: false);

  securityContext.setTrustedCertificatesBytes(utf8.encode(caPem));

  final httpClient = HttpClient(context: securityContext);
  httpClient.badCertificateCallback = (cert, host, port) => false;

  return IOClient(httpClient);
}
