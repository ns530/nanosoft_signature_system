# Deployment / Network Diagram
## HolcemLK Banker Customer Signature & Image Collection System

*(Not explicitly requested, but a standard System Design artifact — added because the architecture depends heavily on physical LAN topology and VLAN isolation, which deserves its own diagram separate from the logical component diagram.)*

```mermaid
graph TB
    Internet["Internet"]
    Router["WiFi Router / Firewall<br/>- Port forwarding: DISABLED<br/>- UPnP: DISABLED<br/>- WPA3 / WPA2-Enterprise<br/>- Default admin creds changed"]

    Internet -. "no inbound access<br/>(explicitly blocked)" .-x Router

    subgraph VLAN["Branch VLAN / Subnet (e.g. 192.168.1.x)"]
        HostPC["Backend Host PC<br/>- Node.js backend (HTTPS)<br/>- MySQL (both DBs)<br/>- Redis<br/>- Disk encryption enabled"]
        AdminDev["Admin Device<br/>- QR Generator App<br/>- TLS cert trusted"]
        OfficerDev1["Officer Device 1<br/>- Collector App<br/>- TLS cert trusted"]
        OfficerDev2["Officer Device 2<br/>- Collector App<br/>- TLS cert trusted"]
    end

    Router --- HostPC
    Router --- AdminDev
    Router --- OfficerDev1
    Router --- OfficerDev2

    AdminDev -. "HTTPS/TLS" .-> HostPC
    OfficerDev1 -. "HTTPS/TLS" .-> HostPC
    OfficerDev2 -. "HTTPS/TLS" .-> HostPC

    style Internet fill:#f7dede,stroke:#b33
    style Router fill:#fff3cd,stroke:#a80
    style VLAN fill:#e8f5e9,stroke:#3a3
```

### Notes
- If the router supports VLANs, all four devices sit on one isolated branch VLAN, separate from any guest/other office traffic.
- If VLANs are not supported, the compensating controls from the SRS/Configuration Document apply instead: OTP step-up on new device/IP, concurrent-login lockout, and audit-based anomaly alerts — **not** static IP/MAC binding (previously ruled out as impractical for officers using multiple devices).
- The Backend Host PC is the single point of physical security focus: disk encryption, OS auto-lock, and restricted physical access are mandatory since both databases and the encrypted image store live there.
