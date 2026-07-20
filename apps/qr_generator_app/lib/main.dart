import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:freerasp/freerasp.dart';
import 'services/auth_service.dart';
import 'services/pinned_http_client.dart';
import 'services/qr_service.dart';
import 'screens/login_screen.dart';

late final AuthService authService;
late final QrService qrService;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final client = await loadPinnedHttpClient();
  authService = AuthService(client: client);
  qrService = QrService(authService: authService, client: client);

  final config = TalsecConfig(
    androidConfig: AndroidConfig(
      packageName: 'com.holcemlk.qr_generator_app',
      signingCertHashes: ['iEuC76kfvAddYf7ofpMzoZjENWRIyC64XQdExqB8+rI='],
      supportedStores: ['com.sec.android.app.samsungapps'],
    ),
    iosConfig: IOSConfig(
      bundleIds: ['com.holcemlk.qrGeneratorApp'],
      teamId: 'CHANGE_ME_TO_TEAM_ID',
    ),
    watcherMail: 'security@holcemlk.com',
    isProd: true,
    killOnBypass: true,
  );

  Talsec.instance.attachListener(ThreatCallback(
    onPrivilegedAccess: () => _onThreatDetected('Root/Jailbreak detected'),
    onSimulator: () => _onThreatDetected('Emulator/Simulator detected'),
    onHooks: () => _onThreatDetected('Hooking framework detected'),
    onDebug: () => _onThreatDetected('Debugger detected'),
    onDeviceBinding: () => _onThreatDetected('Device binding mismatch'),
    onAppIntegrity: () => _onThreatDetected('App integrity compromised'),
    onUnofficialStore: () => print('Unofficial app store'),
    // Non-blocking: release minification/obfuscation currently disabled as freerasp 8.0.0 ProGuard workaround
    onObfuscationIssues: () => print('Obfuscation issues (non-blocking)'),
    onPasscode: () => print('Device passcode not set'),
    onSecureHardwareNotAvailable: () => print('Secure hardware not available'),
    onSystemVPN: () => print('System VPN detected'),
    onDevMode: () => print('Developer mode enabled'),
    onADBEnabled: () => print('USB debugging enabled'),
    onDeviceID: () => _onThreatDetected('Device ID mismatch'),
    onMultiInstance: () => _onThreatDetected('Multi-instance detected'),
    onLocationSpoofing: () => print('Location spoofing detected'),
    onTimeSpoofing: () => _onThreatDetected('Time spoofing detected'),
    onUnsecureWiFi: () => print('Unsecure WiFi detected'),
    onAutomation: () => _onThreatDetected('Automation tool detected'),
    onScreenshot: () => print('Screenshot detected (info only)'),
    onScreenRecording: () => print('Screen recording detected (info only)'),
    onMalware: (_) => _onThreatDetected('Malicious app detected'),
  ));

  try {
    await Talsec.instance.start(config);
  } catch (e) {
    _onThreatDetected('freeRASP initialization failed');
  }

  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  runApp(const QrGeneratorApp());
}

final ValueNotifier<String?> threatMessage = ValueNotifier(null);

void _onThreatDetected(String message) {
  threatMessage.value = message;
}

class QrGeneratorApp extends StatefulWidget {
  const QrGeneratorApp({super.key});

  @override
  State<QrGeneratorApp> createState() => _QrGeneratorAppState();
}

class _QrGeneratorAppState extends State<QrGeneratorApp> {
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
      title: 'HolcemLK QR Generator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: Colors.blue, useMaterial3: true),
      home: threatMessage.value != null
          ? const BlockedScreen()
          : LoginScreen(authService: authService),
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
              Text('Rooted/jailbroken or emulator devices are not supported for security reasons.'),
            ],
          ),
        ),
      ),
    );
  }
}
