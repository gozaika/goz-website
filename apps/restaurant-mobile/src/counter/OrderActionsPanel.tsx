import { ApiError, newIdempotencyKey } from "@gozaika/mobile-core";
import { accents, Badge, Button, Card, EmptyState, Text, palette, toneColors } from "@gozaika/mobile-ui";
import { incidentTypeCodes, type IncidentTypeCode, type PickupVerifyResultDto } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useCounterOrder, useCreateIncident, useNoShow, useVerifyPickup } from "@/api/counter";
import { useAuth } from "@/auth/useAuth";
import { QrScanner } from "@/counter/QrScanner";
import { orderStatusLabel, orderStatusTone, pickupResultTone } from "@/counter/status";

const inputStyle = {
  borderWidth: 1,
  borderColor: palette.border,
  borderRadius: 10,
  padding: 12,
  backgroundColor: palette.white,
  color: palette.charcoal,
  fontSize: 16,
} as const;

/**
 * A replay-safe idempotency key that stays stable while `dep` is unchanged (so a
 * retry of the *same* logical action reuses the key) and rotates when `dep`
 * changes (a new OTP / reason is a new action).
 */
function useStableIdempotencyKey(dep: string): string {
  const ref = useRef<{ readonly dep: string; readonly key: string } | null>(null);
  if (ref.current?.dep !== dep) {
    ref.current = { dep, key: newIdempotencyKey() };
  }
  return ref.current.key;
}

function ResultBanner({ tone, title, message }: { tone: ReturnType<typeof toneColors>; title: string; message: string }) {
  return (
    <View style={{ backgroundColor: tone.bg, borderRadius: 10, padding: 12, gap: 2 }}>
      <Text variant="label" color={tone.fg}>
        {title}
      </Text>
      <Text variant="caption" color={tone.fg}>
        {message}
      </Text>
    </View>
  );
}

/**
 * Counter order detail + actions (verify / no-show / incident), content-only so it
 * can be the phone detail route *and* the tablet master-detail right pane. Pure
 * presentation over the shared hooks; all authority stays server-side.
 */
export function OrderActionsPanel({ orderId }: { readonly orderId: string }) {
  const { selectedRestaurantPk } = useAuth();
  const order = useCounterOrder(selectedRestaurantPk, orderId);

  const verify = useVerifyPickup(selectedRestaurantPk, orderId);
  const noShow = useNoShow(selectedRestaurantPk, orderId);
  const incident = useCreateIncident(selectedRestaurantPk, orderId);

  const [otp, setOtp] = useState("");
  const [reason, setReason] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentTypeCode>("QUALITY_ISSUE");
  const [description, setDescription] = useState("");
  const [scanning, setScanning] = useState(false);

  // Stable, replay-safe keys: a retry of the same OTP/reason reuses the key.
  const verifyKey = useStableIdempotencyKey(`verify:${orderId}:${otp}`);
  const noShowKey = useStableIdempotencyKey(`no-show:${orderId}:${reason.trim()}`);

  // Clear the raw OTP from memory once verification reaches a terminal result.
  const verifyResultCode = verify.data?.resultCode;
  useEffect(() => {
    if (verifyResultCode === "SUCCESS" || verifyResultCode === "ALREADY_COLLECTED") {
      setOtp("");
    }
  }, [verifyResultCode]);

  if (!order) {
    return (
      <EmptyState
        title="Order not loaded"
        message="Open this order from the pickup queue so its details are available."
      />
    );
  }

  const verifyResult: PickupVerifyResultDto | undefined = verify.data;
  // Never-false-collected: a network failure leaves the order UNVERIFIED. We show a
  // warning that the pickup is NOT confirmed — we never optimistically mark collected.
  const verifyOffline = verify.isError && verify.error instanceof ApiError && verify.error.code === "NETWORK";
  const verifyError = verify.isError && !verifyOffline ? (verify.error as ApiError).message : null;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="title">{order.orderNumber}</Text>
        <Badge label={orderStatusLabel(order.orderStatusCode)} tone={orderStatusTone(order.orderStatusCode)} />
      </View>

      <Card>
        <Text variant="heading">{order.bagDisplayName}</Text>
        <Text variant="caption" color={palette.muted}>
          {order.dietaryCategoryCode}
          {order.spiceLevelCode ? ` · ${order.spiceLevelCode}` : ""} · Qty {order.quantity}
        </Text>
        {order.allergenSummaryText ? (
          <Text variant="caption" color={palette.muted}>
            Allergens: {order.allergenSummaryText}
          </Text>
        ) : null}
        <Text variant="label">{formatPaise(order.paidAmountPaise)}</Text>
      </Card>

      {/* Verify pickup */}
      <Card>
        <Text variant="heading">Verify pickup</Text>
        <Text variant="caption" color={palette.muted}>
          Scan the customer's pickup QR, or enter their 6-digit OTP. The server verifies and marks collected.
        </Text>
        <Button
          label="Scan pickup QR"
          variant="secondary"
          accent={accents.restaurant}
          disabled={order.orderStatusCode === "COLLECTED" || verify.isPending}
          onPress={() => setScanning(true)}
        />
        <TextInput
          style={inputStyle}
          value={otp}
          onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
          placeholder="or enter 6-digit OTP"
          placeholderTextColor={palette.muted}
          keyboardType="number-pad"
          maxLength={6}
          editable={order.orderStatusCode !== "COLLECTED"}
        />
        <Button
          label={order.orderStatusCode === "COLLECTED" ? "Already collected" : "Verify & mark collected"}
          accent={accents.restaurant}
          disabled={otp.length !== 6 || order.orderStatusCode === "COLLECTED"}
          loading={verify.isPending}
          onPress={() => verify.mutate({ otp, deviceLabel: "Counter app", idempotencyKey: verifyKey })}
        />
        {order.pickupVerificationAttemptCount > 0 ? (
          <Text variant="caption" color={palette.muted}>
            {order.pickupVerificationAttemptCount} prior attempt{order.pickupVerificationAttemptCount > 1 ? "s" : ""}
            {order.lastPickupVerificationResultCode ? ` · last: ${order.lastPickupVerificationResultCode.replaceAll("_", " ")}` : ""}
          </Text>
        ) : null}
        {verifyResult ? (
          <ResultBanner
            tone={toneColors(pickupResultTone(verifyResult.resultCode))}
            title={verifyResult.resultCode === "SUCCESS" ? "Collected" : verifyResult.resultCode.replaceAll("_", " ")}
            message={verifyResult.message}
          />
        ) : null}
        {verifyOffline ? (
          <ResultBanner
            tone={toneColors("warning")}
            title="Not confirmed — no network"
            message="The pickup was NOT marked collected. Reconnect and verify the OTP again."
          />
        ) : null}
        {verifyError ? <ResultBanner tone={toneColors("danger")} title="Could not verify" message={verifyError} /> : null}
      </Card>

      {/* No-show */}
      <Card>
        <Text variant="heading">Mark no-show</Text>
        <Text variant="caption" color={palette.muted}>
          Only after the pickup window closes. The server rejects early no-shows.
        </Text>
        <TextInput
          style={[inputStyle, { minHeight: 64 }]}
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (min 8 characters)"
          placeholderTextColor={palette.muted}
          multiline
        />
        <Button
          label="Mark no-show"
          variant="secondary"
          accent={accents.restaurant}
          disabled={reason.trim().length < 8}
          loading={noShow.isPending}
          onPress={() => noShow.mutate({ reasonText: reason.trim(), idempotencyKey: noShowKey })}
        />
        {noShow.data ? (
          <ResultBanner tone={toneColors("info")} title="No-show recorded" message={noShow.data.message} />
        ) : null}
        {noShow.isError ? (
          <ResultBanner
            tone={toneColors("danger")}
            title="Could not mark no-show"
            message={noShow.error instanceof ApiError ? noShow.error.message : "Please try again."}
          />
        ) : null}
      </Card>

      {/* Incident */}
      <Card>
        <Text variant="heading">Log incident</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {incidentTypeCodes.map((code) => {
            const active = code === incidentType;
            return (
              <Pressable
                key={code}
                onPress={() => setIncidentType(code)}
                style={{
                  borderWidth: 1,
                  borderColor: active ? accents.restaurant : palette.border,
                  backgroundColor: active ? accents.restaurant : palette.white,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text variant="caption" color={active ? palette.white : palette.muted}>
                  {code.replaceAll("_", " ")}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={[inputStyle, { minHeight: 64 }]}
          value={description}
          onChangeText={setDescription}
          placeholder="What happened? (min 10 characters)"
          placeholderTextColor={palette.muted}
          multiline
        />
        <Button
          label="Log incident"
          variant="secondary"
          accent={accents.restaurant}
          disabled={description.trim().length < 10}
          loading={incident.isPending}
          onPress={() => incident.mutate({ typeCode: incidentType, descriptionText: description.trim() })}
        />
        {incident.data ? (
          <ResultBanner
            tone={toneColors("success")}
            title="Incident logged"
            message={`${incident.data.titleText} · ${incident.data.severityCode}`}
          />
        ) : null}
        {incident.isError ? (
          <ResultBanner
            tone={toneColors("danger")}
            title="Could not log incident"
            message={incident.error instanceof ApiError ? incident.error.message : "Please try again."}
          />
        ) : null}
      </Card>

      <QrScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={(payload) => {
          setScanning(false);
          verify.mutate({ qrPayload: payload, deviceLabel: "Counter app (QR)", idempotencyKey: newIdempotencyKey() });
        }}
      />
    </View>
  );
}
