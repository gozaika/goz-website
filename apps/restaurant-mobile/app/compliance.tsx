import { ApiError } from "@gozaika/mobile-core";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  palette,
  Screen,
  Skeleton,
  spacing,
  Text,
  type StatusTone,
} from "@gozaika/mobile-ui";
import type { RestaurantDocumentDto, RestaurantDocumentTypeCode } from "@gozaika/types";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Alert, Linking, View } from "react-native";
import { fetchDocumentSignedUrl, useDocuments, useUploadDocument } from "@/api/documents";
import { useAuth } from "@/auth/useAuth";

const DOC_TYPES: readonly { code: RestaurantDocumentTypeCode; label: string }[] = [
  { code: "FSSAI_LICENSE", label: "FSSAI License" },
  { code: "GST_CERTIFICATE", label: "GST Certificate" },
  { code: "PAN_CARD", label: "PAN Card" },
  { code: "BANK_CANCELLED_CHEQUE", label: "Cancelled Cheque" },
  { code: "FOOD_SAFETY_AUDIT", label: "Food Safety Audit" },
  { code: "MENU_CARD", label: "Menu Card" },
  { code: "IDENTITY_PROOF", label: "Identity Proof" },
];

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

function statusTone(code: string): StatusTone {
  switch (code) {
    case "APPROVED":
      return "success";
    case "UNDER_REVIEW":
      return "info";
    case "PENDING_REVIEW":
      return "warning";
    case "REJECTED":
    case "EXPIRED":
      return "danger";
    default:
      return "neutral";
  }
}

export default function ComplianceScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDocuments(selectedRestaurantPk);
  const upload = useUploadDocument();
  const [busyCode, setBusyCode] = useState<string | null>(null);

  if (!selectedRestaurantPk) {
    return (
      <Screen scroll={false}>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from More to manage compliance documents." />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={90} />
        <Skeleton height={90} />
      </Screen>
    );
  }
  if (isError && !data) {
    const code = error instanceof ApiError ? error.code : null;
    return (
      <Screen scroll={false}>
        <ErrorState
          title={code === "ROLE_DENIED" ? "Not available for your role" : undefined}
          message={error instanceof ApiError ? error.message : "Could not load compliance documents."}
          onRetry={code === "ROLE_DENIED" ? undefined : () => refetch()}
        />
      </Screen>
    );
  }

  const latestByType = new Map<string, RestaurantDocumentDto>();
  for (const doc of data?.documents ?? []) {
    if (!latestByType.has(doc.documentTypeCode)) latestByType.set(doc.documentTypeCode, doc);
  }

  async function pickAndUpload(typeCode: RestaurantDocumentTypeCode) {
    if (!selectedRestaurantPk) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? "";
    if (!ALLOWED_MIME.includes(mime as AllowedMime)) {
      Alert.alert("Unsupported file", "Please choose a PDF, JPEG, PNG or WebP file.");
      return;
    }
    let sizeBytes = asset.size ?? 0;
    if (!sizeBytes) {
      try {
        sizeBytes = (await (await fetch(asset.uri)).blob()).size;
      } catch {
        sizeBytes = 0;
      }
    }
    if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
      Alert.alert("File too large", "Documents must be between 1 byte and 10 MB.");
      return;
    }

    setBusyCode(typeCode);
    upload.mutate(
      {
        restaurantPk: selectedRestaurantPk,
        documentTypeCode: typeCode,
        fileName: asset.name ?? `${typeCode}.bin`,
        mimeType: mime as AllowedMime,
        sizeBytes,
        uri: asset.uri,
      },
      {
        onError: (e) => Alert.alert("Upload failed", e instanceof ApiError ? e.message : "Please try again."),
        onSettled: () => setBusyCode(null),
      },
    );
  }

  async function openDocument(documentPk: string) {
    if (!selectedRestaurantPk) return;
    try {
      const url = await fetchDocumentSignedUrl(selectedRestaurantPk, documentPk);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Could not open", e instanceof ApiError ? e.message : "Please try again.");
    }
  }

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Compliance documents</Text>
      <Text variant="body" color={palette.muted}>
        Upload your licences and verification documents (PDF or image, up to 10 MB). They're stored privately and
        reviewed by the goZaika team — only your restaurant's owners/admins can see them.
      </Text>

      {DOC_TYPES.map(({ code, label }) => {
        const doc = latestByType.get(code);
        const busy = busyCode === code && upload.isPending;
        return (
          <Card key={code}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text variant="heading">{label}</Text>
              {doc ? (
                <Badge label={doc.statusCode.replaceAll("_", " ")} tone={statusTone(doc.statusCode)} />
              ) : (
                <Badge label="Not uploaded" tone="neutral" />
              )}
            </View>
            {doc ? (
              <Text variant="caption" color={palette.muted}>
                {doc.originalFilename ?? "Document"}
                {doc.expiresAt ? ` · expires ${doc.expiresAt}` : ""} · uploaded{" "}
                {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}
              </Text>
            ) : null}
            {doc?.statusCode === "REJECTED" && doc.rejectionReason ? (
              <Text variant="caption" color={palette.dangerFg}>
                Rejected: {doc.rejectionReason}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
              <Button
                label={busy ? "Uploading…" : doc ? "Replace" : "Upload"}
                accent={palette.forest}
                loading={busy}
                onPress={() => pickAndUpload(code)}
              />
              {doc ? (
                <Button label="View" variant="secondary" accent={palette.forest} onPress={() => openDocument(doc.documentPk)} />
              ) : null}
            </View>
          </Card>
        );
      })}

      <Text variant="caption" color={palette.muted}>
        A replaced document is submitted as a new version for review; the previous one stays on record.
      </Text>
    </Screen>
  );
}
