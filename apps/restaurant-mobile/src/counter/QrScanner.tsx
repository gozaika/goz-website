import { accents, Button, palette, Text } from "@gozaika/mobile-ui";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { Modal, View } from "react-native";

/**
 * Just-in-time pickup QR scanner (Slice 7 follow-up). Requests camera permission
 * only when opened; on the first QR it reads, it hands the raw payload back and
 * closes. Manual OTP entry remains the fallback when the camera is denied. The
 * server still re-validates and hashes the payload — the scan is only capture.
 */
export function QrScanner({
  visible,
  onScanned,
  onClose,
}: {
  readonly visible: boolean;
  readonly onScanned: (payload: string) => void;
  readonly onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => (handledRef.current = false)}>
      <View style={{ flex: 1, backgroundColor: palette.charcoal }}>
        {!permission ? (
          <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
            <Text variant="body" color={palette.white}>
              Preparing the camera…
            </Text>
          </View>
        ) : !permission.granted ? (
          <View style={{ flex: 1, justifyContent: "center", gap: 16, padding: 24 }}>
            <Text variant="heading" color={palette.white}>
              Camera access needed
            </Text>
            <Text variant="body" color={palette.cream}>
              Allow camera access to scan the customer's pickup QR, or close and enter the 6-digit OTP instead.
            </Text>
            <Button label="Allow camera" accent={accents.restaurant} onPress={() => requestPermission()} />
            <Button label="Use OTP instead" variant="ghost" accent={palette.white} onPress={onClose} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => {
                if (handledRef.current) {
                  return;
                }
                handledRef.current = true;
                onScanned(data);
              }}
            />
            <View style={{ position: "absolute", top: 56, left: 0, right: 0, alignItems: "center" }}>
              <Text variant="label" color={palette.white}>
                Point at the customer's pickup QR
              </Text>
            </View>
            <View style={{ position: "absolute", bottom: 40, left: 24, right: 24 }}>
              <Button label="Cancel" variant="secondary" accent={palette.white} onPress={onClose} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
