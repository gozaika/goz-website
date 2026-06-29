import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, EmptyState, ErrorState, Screen, Text, palette, toneColors } from "@gozaika/mobile-ui";
import type { RestaurantComplianceStatusCode, RestaurantProfileData } from "@gozaika/types";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import {
  useGeoOptions,
  useRestaurantProfile,
  useUpdateRestaurantBasics,
  useUpdateRestaurantLocation,
} from "@/api/profile";
import { useAuth } from "@/auth/useAuth";

function SelectModal({
  label,
  value,
  placeholder,
  options,
  onSelect,
}: {
  readonly label: string;
  readonly value: string | null;
  readonly placeholder: string;
  readonly options: readonly { readonly key: string; readonly label: string }[];
  readonly onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);
  return (
    <View style={{ gap: 4 }}>
      <Text variant="caption" color={palette.muted}>
        {label}
      </Text>
      <Pressable onPress={() => setOpen(true)} style={inputStyle}>
        <Text variant="body" color={selected ? palette.charcoal : palette.muted}>
          {selected?.label ?? placeholder}
        </Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: palette.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70%", padding: 16 }}>
            <Text variant="heading">{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    onSelect(o.key);
                    setOpen(false);
                  }}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.border }}
                >
                  <Text variant="body" color={o.key === value ? palette.forest : palette.charcoal}>
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: palette.border,
  borderRadius: 10,
  padding: 12,
  backgroundColor: palette.white,
  color: palette.charcoal,
  fontSize: 16,
} as const;

function complianceTone(code: RestaurantComplianceStatusCode | null) {
  switch (code) {
    case "APPROVED":
      return "success" as const;
    case "REJECTED":
    case "EXPIRED":
      return "danger" as const;
    case "UNDER_REVIEW":
      return "info" as const;
    default:
      return "warning" as const;
  }
}

function Field({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="caption" color={palette.muted}>
        {label}
      </Text>
      <Text variant="body">{value ?? "—"}</Text>
    </View>
  );
}

function EditBasics({ profile, restaurantPk }: { readonly profile: RestaurantProfileData; readonly restaurantPk: string }) {
  const update = useUpdateRestaurantBasics(restaurantPk);
  const geo = useGeoOptions(restaurantPk, true);
  const [name, setName] = useState(profile.restaurantName);
  const [email, setEmail] = useState(profile.primaryContactEmail ?? "");
  const [phone, setPhone] = useState(profile.primaryContactPhoneE164 ?? "");
  const [pickup, setPickup] = useState(profile.pickupInstructions ?? "");
  const [cityPk, setCityPk] = useState<string | null>(profile.cityPk);
  const [neighborhoodPk, setNeighborhoodPk] = useState<string | null>(profile.neighborhoodPk);
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [story, setStory] = useState(profile.storyMarkdown ?? "");

  const cityOptions = (geo.data?.cities ?? []).map((c) => ({ key: c.cityPk, label: c.cityName }));
  const neighborhoodOptions = (geo.data?.neighborhoods ?? [])
    .filter((n) => n.cityPk === cityPk)
    .map((n) => ({ key: n.neighborhoodPk, label: n.neighborhoodName }));

  return (
    <Card>
      <Text variant="heading">Edit basics</Text>
      <Text variant="caption" color={palette.muted}>
        Name
      </Text>
      <TextInput accessibilityLabel="Restaurant name" style={inputStyle} value={name} onChangeText={setName} placeholder="Restaurant name" placeholderTextColor={palette.muted} />
      <Text variant="caption" color={palette.muted}>
        Primary contact email
      </Text>
      <TextInput
        accessibilityLabel="Primary contact email"
        style={inputStyle}
        value={email}
        onChangeText={setEmail}
        placeholder="contact@example.com"
        placeholderTextColor={palette.muted}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text variant="caption" color={palette.muted}>
        Primary contact phone
      </Text>
      <TextInput accessibilityLabel="Primary contact phone" style={inputStyle} value={phone} onChangeText={setPhone} placeholder="+91…" placeholderTextColor={palette.muted} keyboardType="phone-pad" />
      <Text variant="caption" color={palette.muted}>
        Pickup instructions
      </Text>
      <TextInput
        accessibilityLabel="Pickup instructions"
        style={[inputStyle, { minHeight: 72 }]}
        value={pickup}
        onChangeText={setPickup}
        placeholder="How should customers collect their order?"
        placeholderTextColor={palette.muted}
        multiline
      />
      <SelectModal
        label="City"
        value={cityPk}
        placeholder={geo.isLoading ? "Loading…" : "Select a city"}
        options={cityOptions}
        onSelect={(key) => {
          setCityPk(key);
          setNeighborhoodPk(null);
        }}
      />
      <SelectModal
        label="Neighborhood"
        value={neighborhoodPk}
        placeholder={cityPk ? "Select a neighborhood" : "Pick a city first"}
        options={neighborhoodOptions}
        onSelect={setNeighborhoodPk}
      />
      <Text variant="caption" color={palette.muted}>
        Public headline
      </Text>
      <TextInput
        accessibilityLabel="Public headline"
        style={inputStyle}
        value={headline}
        onChangeText={setHeadline}
        placeholder="A short line customers see (min 8 chars)"
        placeholderTextColor={palette.muted}
      />
      <Text variant="caption" color={palette.muted}>
        Public story
      </Text>
      <TextInput
        accessibilityLabel="Public story"
        style={[inputStyle, { minHeight: 88 }]}
        value={story}
        onChangeText={setStory}
        placeholder="Tell customers about your kitchen"
        placeholderTextColor={palette.muted}
        multiline
      />
      <Button
        label="Save basics"
        accent={palette.forest}
        disabled={name.trim().length < 2 || !email.includes("@") || (headline.trim().length > 0 && headline.trim().length < 8)}
        loading={update.isPending}
        onPress={() =>
          update.mutate({
            restaurantName: name.trim(),
            restaurantSlug: profile.restaurantSlug,
            legalEntityName: profile.legalEntityName ?? undefined,
            primaryContactEmail: email.trim(),
            primaryContactPhoneE164: phone.trim() || undefined,
            pickupInstructions: pickup.trim() || undefined,
            cityPk: cityPk,
            neighborhoodPk: neighborhoodPk,
            headline: headline.trim() || undefined,
            storyMarkdown: story.trim() || undefined,
          })
        }
      />
      {update.isSuccess ? (
        <View style={{ backgroundColor: toneColors("success").bg, borderRadius: 10, padding: 12 }}>
          <Text variant="label" color={toneColors("success").fg}>
            Basics saved.
          </Text>
        </View>
      ) : null}
      {update.isError ? (
        <View style={{ backgroundColor: toneColors("danger").bg, borderRadius: 10, padding: 12 }}>
          <Text variant="caption" color={toneColors("danger").fg}>
            {update.error instanceof ApiError ? update.error.message : "Could not save. Please try again."}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function LocationCard({
  profile,
  restaurantPk,
  canEdit,
}: {
  readonly profile: RestaurantProfileData;
  readonly restaurantPk: string;
  readonly canEdit: boolean;
}) {
  const update = useUpdateRestaurantLocation(restaurantPk);
  const [lat, setLat] = useState(profile.latitude !== null ? String(profile.latitude) : "");
  const [lng, setLng] = useState(profile.longitude !== null ? String(profile.longitude) : "");
  const [locating, setLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const latNum = Number.parseFloat(lat);
  const lngNum = Number.parseFloat(lng);
  const valid =
    Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
  const hasPin = profile.latitude !== null && profile.longitude !== null;

  async function useCurrentLocation() {
    setPermissionDenied(false);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    } catch {
      setPermissionDenied(true);
    } finally {
      setLocating(false);
    }
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="heading">Pickup location pin</Text>
        <Badge label={hasPin ? "Pinned" : "Not set"} tone={hasPin ? "success" : "warning"} />
      </View>
      <Text variant="caption" color={palette.muted}>
        A map pin helps customers find your counter. Use your current location or enter coordinates.
      </Text>

      {!canEdit ? (
        <Field label="Coordinates" value={hasPin ? `${profile.latitude}, ${profile.longitude}` : null} />
      ) : (
        <>
          <Button
            label={locating ? "Locating…" : "Use my current location"}
            variant="secondary"
            accent={palette.forest}
            loading={locating}
            onPress={useCurrentLocation}
          />
          {permissionDenied ? (
            <Text variant="caption" color={toneColors("danger").fg}>
              Location permission denied. Enter the coordinates manually below.
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="caption" color={palette.muted}>
                Latitude
              </Text>
              <TextInput
                accessibilityLabel="Latitude"
                style={inputStyle}
                value={lat}
                onChangeText={setLat}
                placeholder="17.4400"
                placeholderTextColor={palette.muted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="caption" color={palette.muted}>
                Longitude
              </Text>
              <TextInput
                accessibilityLabel="Longitude"
                style={inputStyle}
                value={lng}
                onChangeText={setLng}
                placeholder="78.3489"
                placeholderTextColor={palette.muted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <Button
            label="Save pin"
            accent={palette.forest}
            disabled={!valid}
            loading={update.isPending}
            onPress={() => update.mutate({ latitude: latNum, longitude: lngNum })}
          />
          {hasPin ? (
            <Button
              label="Clear pin"
              variant="ghost"
              accent={palette.forest}
              disabled={update.isPending}
              onPress={() => {
                setLat("");
                setLng("");
                update.mutate({ latitude: null, longitude: null });
              }}
            />
          ) : null}
          {update.isSuccess ? (
            <View style={{ backgroundColor: toneColors("success").bg, borderRadius: 10, padding: 12 }}>
              <Text variant="label" color={toneColors("success").fg}>
                Location saved.
              </Text>
            </View>
          ) : null}
          {update.isError ? (
            <View style={{ backgroundColor: toneColors("danger").bg, borderRadius: 10, padding: 12 }}>
              <Text variant="caption" color={toneColors("danger").fg}>
                {update.error instanceof ApiError ? update.error.message : "Could not save the location."}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

export default function ProfileScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useRestaurantProfile(selectedRestaurantPk);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [selectedRestaurantPk]);

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home to view its profile." />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={palette.forest} />
      </Screen>
    );
  }
  if (isError || !profile) {
    return (
      <Screen>
        <ErrorState message={error instanceof ApiError ? error.message : "Could not load the profile."} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const c = profile.compliance;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text variant="title">{profile.restaurantName}</Text>
        <Badge label={profile.statusCode.replaceAll("_", " ")} tone={profile.statusCode === "ACTIVE" ? "success" : "neutral"} />
      </View>

      <Card>
        <Field label="Public URL" value={`/${profile.restaurantSlug}`} />
        <Field label="Legal entity" value={profile.legalEntityName} />
        <Field label="Location" value={[profile.neighborhoodName, profile.cityName].filter(Boolean).join(", ") || null} />
        <Field label="Contact email" value={profile.primaryContactEmail} />
        <Field label="Contact phone" value={profile.primaryContactPhoneE164} />
        <Field label="Pickup instructions" value={profile.pickupInstructions} />
        <Field label="Public headline" value={profile.headline} />
        <Field label="Public story" value={profile.storyMarkdown} />
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="heading">Compliance</Text>
          <Badge label={c.statusCode ? c.statusCode.replaceAll("_", " ") : "Not started"} tone={complianceTone(c.statusCode)} />
        </View>
        <Text variant="caption" color={palette.muted}>
          FSSAI {c.fssaiPresent ? "on file" : "missing"}
          {c.fssaiExpiryDate ? ` · expires ${c.fssaiExpiryDate}` : ""} · GSTIN {c.gstinPresent ? "on file" : "missing"} · PAN{" "}
          {c.panPresent ? "on file" : "missing"}
        </Text>
        <Text variant="caption" color={palette.muted}>
          License numbers are managed on the web portal (kept off-device).
        </Text>
      </Card>

      <LocationCard profile={profile} restaurantPk={selectedRestaurantPk} canEdit={profile.canEditBasics} />

      {profile.canEditBasics ? (
        editing ? (
          <EditBasics profile={profile} restaurantPk={selectedRestaurantPk} />
        ) : (
          <Button label="Edit basics" variant="secondary" accent={palette.forest} onPress={() => setEditing(true)} />
        )
      ) : (
        <Text variant="caption" color={palette.muted}>
          Your role can view this profile. Editing basics needs an owner or admin.
        </Text>
      )}
    </Screen>
  );
}
