import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:freerasp/freerasp.dart';
import 'services/auth_service.dart';
import 'services/pinned_http_client.dart';
import 'services/qr_service.dart';
import 'services/customer_service.dart';
import 'services/upload_service.dart';
import 'screens/login_screen.dart';

late final AuthService authService;
late final QrService qrService;
late final CustomerService customerService;
late final UploadService uploadService;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final client = await loadPinnedHttpClient();
  authService = AuthService(client: client);
  qrService = QrService(client: client);
  customerService = CustomerService(client: client);
  uploadService = UploadService(client: client);

  final config = TalsecConfig(
    androidConfig: AndroidConfig(
      packageName: 'com.holcemlk.collector_app',
      signingCertHashes: ['iEuC76kfvAddYf7ofpMzoZjENWRIyC64XQdExqB8+rI='],
      supportedStores: ['com.sec.android.app.samsungapps'],
    ),
    iosConfig: IOSConfig(
      bundleIds: ['com.holcemlk.collectorApp'],
      teamId: 'CHANGE_ME_TO_TEAM_ID',
    ),
    watcherMail: 'security@holcemlk.com',
    isProd: true,
    killOnBypass: true,
  );

  Talsec.instance.attachListener(ThreatCallback(
    onPrivilegedAccess: () => _onThreat('Root/Jailbreak detected'),
    onSimulator: () => _onThreat('Emulator/Simulator detected'),
    onHooks: () => _onThreat('Hooking framework detected'),
    onDebug: () => _onThreat('Debugger detected'),
    onDeviceBinding: () => _onThreat('Device binding mismatch'),
    onAppIntegrity: () => _onThreat('App integrity compromised'),
    onUnofficialStore: () => print('Unofficial app store'),
    // Non-blocking: release minification/obfuscation currently disabled as freerasp 8.0.0 ProGuard workaround
    onObfuscationIssues: () => print('Obfuscation issues (non-blocking)'),
    onPasscode: () => print('Device passcode not set'),
    onSecureHardwareNotAvailable: () => print('Secure hardware not available'),
    onSystemVPN: () => print('System VPN detected'),
    onDevMode: () => print('Developer mode enabled'),
    onADBEnabled: () => print('USB debugging enabled'),
    onDeviceID: () => _onThreat('Device ID mismatch'),
    onMultiInstance: () => _onThreat('Multi-instance detected'),
    onLocationSpoofing: () => print('Location spoofing detected'),
    onTimeSpoofing: () => _onThreat('Time spoofing detected'),
    onUnsecureWiFi: () => print('Unsecure WiFi detected'),
    onAutomation: () => _onThreat('Automation tool detected'),
    onScreenshot: () => print('Screenshot detected'),
    onScreenRecording: () => print('Screen recording detected'),
    onMalware: (_) => _onThreat('Malicious app detected'),
  ));

  try {
    await Talsec.instance.start(config);
  } catch (_) {
    _onThreat('freeRASP initialization failed');
  }

  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  runApp(const CollectorApp());
}

final ValueNotifier<String?> threatMessage = ValueNotifier(null);

void _onThreat(String message) {
  threatMessage.value = message;
}

class CollectorApp extends StatefulWidget {
  const CollectorApp({super.key});

  @override
  State<CollectorApp> createState() => _CollectorAppState();
}

class _CollectorAppState extends State<CollectorApp> {
  @override
  void initState() {
    super.initState();
    threatMessage.addListener(_onThreatChanged);
  }

  @override
  void dispose() {
    threatMessage.removeListener(_onThreatChanged);
    super.dispose();
  }

  void _onThreatChanged() {
    if (threatMessage.value != null && mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HolcemLK Collector',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: Colors.teal, useMaterial3: true),
      home: threatMessage.value != null
          ? const BlockedScreen()
          : const LoginScreen(),
    );
  }
}

class BlockedScreen extends StatelessWidget {
  const BlockedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Security Check')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.security, size: 64, color: Colors.red),
              SizedBox(height: 24),
              Text('This device cannot run this application.',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              SizedBox(height: 16),
              Text('Rooted/jailbroken or emulator devices are not supported.'),
            ],
          ),
        ),
      ),
    );
  }
}
