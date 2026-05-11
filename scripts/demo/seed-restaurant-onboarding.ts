import { createClient } from "@supabase/supabase-js";
import { readDemoEnvironment } from "./demo-auth-shared";

const slice = "slice2_restaurant_onboarding";
const { supabaseUrl, serviceRoleKey } = readDemoEnvironment();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const restaurants = [
  ["20000000-0000-0000-0000-000000000001", "biryani.baithak@gozaika.example", "Biryani Baithak", "biryani-baithak", "Biryani Baithak Hospitality LLP", "BANJARA_HILLS", "HYDERABADI", "ACTIVE", "APPROVED", "APPROVED"],
  ["20000000-0000-0000-0000-000000000002", "charminar.chai.co@gozaika.example", "Charminar Chai Co.", "charminar-chai-co", "Charminar Chai Company LLP", "TOLICHOWKI", "BAKERY", "ONBOARDING", "UNDER_REVIEW", "UNDER_REVIEW"],
  ["20000000-0000-0000-0000-000000000003", "deccan.dosa.house@gozaika.example", "Deccan Dosa House", "deccan-dosa-house", "Deccan Dosa House Private Limited", "MADHAPUR", "SOUTH_INDIAN", "ONBOARDING", "REJECTED", "REJECTED"],
  ["20000000-0000-0000-0000-000000000004", "golconda.grills@gozaika.example", "Golconda Grills", "golconda-grills", "Golconda Grills Foods LLP", "GACHIBOWLI", "NORTH_INDIAN", "ONBOARDING", "PENDING", "PENDING_REVIEW"],
  ["20000000-0000-0000-0000-000000000005", "hitec.handi@gozaika.example", "HITEC Handi", "hitec-handi", "HITEC Handi Kitchens LLP", "HITECH_CITY", "MULTI_CUISINE", "ONBOARDING", "UNDER_REVIEW", "PENDING_REVIEW"],
] as const;

const fixedAt = "2026-05-02T00:00:00.000Z";

async function register(seedKey: string, entityTable: string, entityId: string) {
  const { error } = await supabase.from("dev_demo_seed_registry").upsert(
    { seed_key: seedKey, entity_table: entityTable, entity_id: entityId, slice, created_at: fixedAt },
    { onConflict: "seed_key" },
  );
  if (error) throw error;
}

async function lookupMaps() {
  const [profiles, city, neighborhoods, cuisines, ownerRole, docType, statuses, visibility] = await Promise.all([
    supabase.from("iam_profile").select("iam_profile_pk,email_address"),
    supabase.from("geo_city").select("geo_city_pk").eq("city_code", "HYD").single(),
    supabase.from("geo_neighborhood").select("geo_neighborhood_pk,neighborhood_code"),
    supabase.from("master_cuisine").select("master_cuisine_pk,cuisine_code"),
    supabase.from("restaurant_team_role").select("restaurant_team_role_pk").eq("role_code", "OWNER").single(),
    supabase.from("master_document_type").select("master_document_type_pk").eq("type_code", "FSSAI_LICENSE").single(),
    supabase.from("master_document_status").select("master_document_status_pk,status_code"),
    supabase.from("master_storage_visibility").select("master_storage_visibility_pk").eq("visibility_code", "SERVICE_ONLY").single(),
  ]);

  for (const result of [profiles, city, neighborhoods, cuisines, ownerRole, docType, statuses, visibility]) {
    if (result.error) throw result.error;
  }

  return {
    profiles: new Map((profiles.data ?? []).map((row) => [String(row.email_address).toLowerCase(), row.iam_profile_pk])),
    cityPk: city.data.geo_city_pk,
    neighborhoods: new Map((neighborhoods.data ?? []).map((row) => [row.neighborhood_code, row.geo_neighborhood_pk])),
    cuisines: new Map((cuisines.data ?? []).map((row) => [row.cuisine_code, row.master_cuisine_pk])),
    ownerRolePk: ownerRole.data.restaurant_team_role_pk,
    docTypePk: docType.data.master_document_type_pk,
    statuses: new Map((statuses.data ?? []).map((row) => [row.status_code, row.master_document_status_pk])),
    visibilityPk: visibility.data.master_storage_visibility_pk,
  };
}

async function main() {
  const maps = await lookupMaps();
  let upserted = 0;

  for (const [restaurantPk, ownerEmail, name, slug, legalName, neighborhoodCode, cuisineCode, restaurantStatus, complianceStatus, documentStatus] of restaurants) {
    const profilePk = maps.profiles.get(ownerEmail);
    if (!profilePk) continue;

    const { error: restaurantError } = await supabase.from("restaurant_restaurant").upsert(
      {
        restaurant_restaurant_pk: restaurantPk,
        restaurant_name: name,
        restaurant_slug: slug,
        legal_entity_name: legalName,
        restaurant_status_code: restaurantStatus,
        geo_city_fk: maps.cityPk,
        geo_neighborhood_fk: maps.neighborhoods.get(neighborhoodCode) ?? null,
        owner_profile_fk: profilePk,
        primary_contact_email: ownerEmail,
        primary_contact_phone_e164: "+919000100000",
        pickup_instructions: "Pickup from the main billing counter. Please bring QR/OTP and arrive during the pickup window.",
        created_at: fixedAt,
        updated_at: fixedAt,
      },
      { onConflict: "restaurant_restaurant_pk" },
    );
    if (restaurantError) throw restaurantError;
    await register(`slice2-restaurant:${restaurantPk}`, "restaurant_restaurant", restaurantPk);

    const { data: membership, error: membershipError } = await supabase
      .from("restaurant_team_membership")
      .upsert(
        {
          restaurant_fk: restaurantPk,
          iam_profile_fk: profilePk,
          restaurant_team_role_fk: maps.ownerRolePk,
          is_active: true,
          is_default: true,
          joined_at: fixedAt,
          created_at: fixedAt,
          updated_at: fixedAt,
        },
        { onConflict: "restaurant_fk,iam_profile_fk,restaurant_team_role_fk" },
      )
      .select("restaurant_team_membership_pk")
      .single();
    if (membershipError || !membership) throw membershipError ?? new Error("Could not upsert membership.");

    await supabase.from("restaurant_compliance").upsert(
      {
        restaurant_fk: restaurantPk,
        fssai_license_number: "12345678901234",
        fssai_license_expiry_date: "2028-03-31",
        gstin: "36ABCDE1234F1Z5",
        pan_number: "ABCDE1234F",
        compliance_status_code: complianceStatus,
        created_at: fixedAt,
        updated_at: fixedAt,
      },
      { onConflict: "restaurant_fk" },
    );

    await supabase.from("restaurant_public_profile").upsert(
      {
        restaurant_fk: restaurantPk,
        headline: "Chef-curated BAM Bags, pickup only.",
        story_markdown: "Not a deal. A discovery. Premium without pretence.",
        created_at: fixedAt,
        updated_at: fixedAt,
      },
      { onConflict: "restaurant_fk" },
    );

    const { data: existingContact } = await supabase
      .from("restaurant_contact")
      .select("restaurant_contact_pk")
      .eq("restaurant_fk", restaurantPk)
      .eq("contact_type_code", "OWNER")
      .eq("is_primary", true)
      .maybeSingle();
    if (!existingContact) {
      await supabase.from("restaurant_contact").insert({
        restaurant_fk: restaurantPk,
        contact_type_code: "OWNER",
        contact_name: `${name} Owner`,
        email_address: ownerEmail,
        phone_e164: "+919000100000",
        is_primary: true,
        created_at: fixedAt,
        updated_at: fixedAt,
      });
    }

    const cuisinePk = maps.cuisines.get(cuisineCode);
    if (cuisinePk) {
      await supabase.from("restaurant_cuisine_map").upsert(
        { restaurant_fk: restaurantPk, master_cuisine_fk: cuisinePk, is_primary: true, created_at: fixedAt, updated_at: fixedAt },
        { onConflict: "restaurant_fk,master_cuisine_fk" },
      );
    }

    for (const [taskCode, taskName, taskStatus] of [
      ["PROFILE", "Restaurant basics", "COMPLETED"],
      ["LOCATION_PICKUP", "Location and pickup instructions", "COMPLETED"],
      ["COMPLIANCE_DETAILS", "Compliance details", "COMPLETED"],
      ["DOCUMENT_UPLOAD", "FSSAI/KYC document upload", restaurantStatus === "ACTIVE" ? "COMPLETED" : "IN_PROGRESS"],
      ["CONTACTS", "Primary contacts", "COMPLETED"],
      ["REVIEW_SUBMISSION", "Submit for admin review", restaurantStatus === "ACTIVE" ? "COMPLETED" : "PENDING"],
    ] as const) {
      await supabase.from("restaurant_onboarding_task").upsert(
        {
          restaurant_fk: restaurantPk,
          task_code: taskCode,
          task_name: taskName,
          task_status_code: taskStatus,
          completed_at: taskStatus === "COMPLETED" ? fixedAt : null,
          created_at: fixedAt,
          updated_at: fixedAt,
        },
        { onConflict: "restaurant_fk,task_code" },
      );
    }

    const index = restaurants.findIndex((row) => row[0] === restaurantPk) + 1;
    const storageObjectPk = `60000000-0000-0000-0000-00000000000${index}`;
    const documentPk = `70000000-0000-0000-0000-00000000000${index}`;
    const objectPath = `restaurants/${restaurantPk}/compliance/FSSAI_LICENSE/demo-fssai.pdf`;
    await supabase.from("storage_object").upsert(
      {
        storage_object_pk: storageObjectPk,
        bucket_name: "private-documents",
        object_path: objectPath,
        original_filename: "demo-fssai.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        master_storage_visibility_fk: maps.visibilityPk,
        uploaded_by_profile_fk: profilePk,
        created_at: fixedAt,
        updated_at: fixedAt,
      },
      { onConflict: "bucket_name,object_path" },
    );
    await register(`slice2-storage:${storageObjectPk}`, "storage_object", storageObjectPk);

    await supabase.from("restaurant_document").upsert(
      {
        restaurant_document_pk: documentPk,
        restaurant_fk: restaurantPk,
        master_document_type_fk: maps.docTypePk,
        master_document_status_fk: maps.statuses.get(documentStatus),
        storage_object_fk: storageObjectPk,
        document_number: "12345678901234",
        expires_at: "2028-03-31",
        rejection_reason: documentStatus === "REJECTED" ? "Uploaded certificate image is unreadable. Please upload a clear PDF or image." : null,
        uploaded_by_profile_fk: profilePk,
        created_at: fixedAt,
        updated_at: fixedAt,
      },
      { onConflict: "restaurant_document_pk" },
    );
    await register(`slice2-document:${documentPk}`, "restaurant_document", documentPk);

    upserted += 1;
  }

  console.log(`Demo restaurant onboarding complete: upserted=${upserted} skipped=${restaurants.length - upserted}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo restaurant onboarding seed failed.");
  process.exitCode = 1;
});
