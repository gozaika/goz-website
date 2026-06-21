import { ApiError } from "@gozaika/mobile-core";
import { accents, Badge, Button, Card, EmptyState, Screen, Text, palette, toneColors } from "@gozaika/mobile-ui";
import { incidentTypeCodes, type IncidentTypeCode, type PickupVerifyResultDto } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useCounterOrder, useCreateIncident, useNoShow, useVerifyPickup } from "@/api/counter";
import { useAuth } from "@/auth/useAuth";
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

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { selectedRestaurantPk } = useAuth();
  const order = useCounterOrder(selectedRestaurantPk, orderId ?? "");

  const verify = useVerifyPickup(selectedRestaurantPk, orderId ?? "");
  const noShow = useNoShow(selectedRestaurantPk, orderId ?? "");
  const incident = useCreateIncident(selectedRestaurantPk, orderId ?? "");

  const [otp, setOtp] = useState("");
  const [reason, setReason] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentTypeCode>("QUALITY_ISSUE");
  const [description, setDescription] = useState("");

  if (!order) {
    return (
      <Screen>
        <EmptyState
          title="Order not loaded"
          message="Open this order from the pickup queue so its details are available."
        />
      </Screen>
    );
  }

  const verifyResult: PickupVerifyResultDto | undefined = verify.data;
  // Never-false-collected: a network failure leaves the order UNVERIFIED. We show a
  // warning that the pickup is NOT confirmed — we never optimistically mark collected.
  const verifyOffline = verify.isError && verify.error instanceof ApiError && verify.error.code === "NETWORK";
  const verifyError = verify.isError && !verifyOffline ? (verify.error as ApiError).message : null;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="title">{order.orderNumber}</Text>
        <Badge label={orderStatusLabel(order.orderStatusCode)} tone={orderStatusTone(order.orderStatusCode)} />
      </View>

      <Card>
        <Text variant="heading">{order.bagDisplayName}</Text>
        <Text variant="caption" color={palette.muted}>
          {order.dietaryCategoryCode} · {order.spiceLevelCode} · Qty {order.quantity}
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
          Enter the customer's 6-digit OTP. Camera QR scan arrives in a follow-up; manual OTP is the verified baseline.
        </Text>
        <TextInput
          style={inputStyle}
          value={otp}
          onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit OTP"
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
          onPress={() => verify.mutate({ otp, deviceLabel: "Counter app" })}
        />
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
          onPress={() => noShow.mutate({ reasonText: reason.trim() })}
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
    </Screen>
  );
}
