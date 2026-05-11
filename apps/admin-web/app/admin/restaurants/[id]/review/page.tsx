import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

export default async function AdminRestaurantReviewPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const { id } = await params;
  const service = createServiceRoleSupabaseClient();
  const [restaurant, compliance, documents, tasks] = await Promise.all([
    service
      .from("restaurant_restaurant")
      .select("restaurant_restaurant_pk,restaurant_name,restaurant_slug,legal_entity_name,restaurant_status_code,primary_contact_email,primary_contact_phone_e164,pickup_instructions")
      .eq("restaurant_restaurant_pk", id)
      .single(),
    service.from("restaurant_compliance").select("*").eq("restaurant_fk", id).maybeSingle(),
    service
      .from("restaurant_document")
      .select("restaurant_document_pk,rejection_reason,reviewed_at,master_document_type(type_code,type_name,is_required),master_document_status(status_code,status_name),storage_object(original_filename)")
      .eq("restaurant_fk", id)
      .order("created_at", { ascending: false }),
    service.from("restaurant_onboarding_task").select("*").eq("restaurant_fk", id).order("created_at"),
  ]);

  if (!restaurant.data) {
    redirect("/admin/restaurants/onboarding");
  }

  return (
    <main>
      <ShellHeader>
        <a className="text-sm font-semibold text-[#1A5C38]" href="/admin/restaurants/onboarding">Back to queue</a>
      </ShellHeader>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <section className="rounded-lg border border-black/10 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Restaurant review</p>
            <h1 className="mt-2 text-3xl font-bold">{restaurant.data.restaurant_name}</h1>
            <div className="mt-4 grid gap-2 text-sm text-black/70 md:grid-cols-2">
              <p>Slug: {restaurant.data.restaurant_slug}</p>
              <p>Status: {restaurant.data.restaurant_status_code}</p>
              <p>Legal entity: {restaurant.data.legal_entity_name ?? "Missing"}</p>
              <p>Email: {restaurant.data.primary_contact_email ?? "Missing"}</p>
              <p>Phone: {restaurant.data.primary_contact_phone_e164 ?? "Missing"}</p>
              <p>Pickup: {restaurant.data.pickup_instructions ?? "Missing"}</p>
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="text-xl font-bold">Compliance</h2>
            <div className="mt-4 grid gap-2 text-sm text-black/70 md:grid-cols-2">
              <p>FSSAI: {compliance.data?.fssai_license_number ?? "Missing"}</p>
              <p>Expiry: {compliance.data?.fssai_license_expiry_date ?? "Missing"}</p>
              <p>GSTIN: {compliance.data?.gstin ?? "Missing"}</p>
              <p>PAN: {compliance.data?.pan_number ?? "Missing"}</p>
              <p>Status: {compliance.data?.compliance_status_code ?? "PENDING"}</p>
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="text-xl font-bold">Documents</h2>
            <div className="mt-4 grid gap-3">
              {(documents.data ?? []).map((document) => {
                const type = Array.isArray(document.master_document_type) ? document.master_document_type[0] : document.master_document_type;
                const status = Array.isArray(document.master_document_status) ? document.master_document_status[0] : document.master_document_status;
                const storageObject = Array.isArray(document.storage_object) ? document.storage_object[0] : document.storage_object;
                return (
                  <div key={document.restaurant_document_pk} className="rounded-lg border border-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{type?.type_name ?? "Document"}</p>
                        <p className="text-sm text-black/60">{storageObject?.original_filename ?? "Private file"} - {status?.status_name ?? "Pending"}</p>
                        {document.rejection_reason ? <p className="mt-1 text-sm text-red-700">{document.rejection_reason}</p> : null}
                      </div>
                      <ReviewActions restaurantPk={id} documentPk={document.restaurant_document_pk} />
                    </div>
                  </div>
                );
              })}
              {!documents.data?.length ? <p className="text-sm text-black/60">No documents uploaded yet.</p> : null}
            </div>
          </section>
        </div>

        <aside className="rounded-lg border border-black/10 bg-white p-5 lg:sticky lg:top-20 lg:self-start">
          <h2 className="text-xl font-bold">Activation gate</h2>
          <div className="mt-4 grid gap-2 text-sm">
            {(tasks.data ?? []).map((task) => <p key={task.restaurant_onboarding_task_pk}>{task.task_name}: {task.task_status_code}</p>)}
          </div>
          <ReviewActions restaurantPk={id} complianceMode />
        </aside>
      </section>
    </main>
  );
}
