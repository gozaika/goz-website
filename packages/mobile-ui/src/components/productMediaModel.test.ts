import { describe, expect, it } from "vitest";
import { resolveProductMedia } from "./productMediaModel";

// Product-media gate #5 (mobile-render half): a real uploaded image renders,
// while null OR failed media transparently falls back to local art.
describe("resolveProductMedia", () => {
  it("renders a real uploaded image (renders through discovery)", () => {
    const m = resolveProductMedia({
      url: "https://x.supabase.co/storage/v1/object/public/public-media/drops/bag.webp",
      alt: "Hyderabadi biryani bag",
    });
    expect(m.showRemote).toBe(true);
    expect(m.uri).toBe("https://x.supabase.co/storage/v1/object/public/public-media/drops/bag.webp");
    expect(m.label).toBe("Hyderabadi biryani bag");
  });

  it("falls back when there is no media (null)", () => {
    expect(resolveProductMedia({ url: null }).showRemote).toBe(false);
    expect(resolveProductMedia({}).showRemote).toBe(false);
    expect(resolveProductMedia({ url: "   " }).showRemote).toBe(false);
    expect(resolveProductMedia({ url: null }).uri).toBeNull();
  });

  it("falls back when the remote image failed to load", () => {
    const m = resolveProductMedia({ url: "https://x/img.webp", alt: "x", failed: true });
    expect(m.showRemote).toBe(false);
    // No label is applied to the fallback frame (it carries its own art).
    expect(m.label).toBeUndefined();
  });

  it("prefers a caller-supplied accessibility label over the asset alt", () => {
    const m = resolveProductMedia({ url: "https://x/img.webp", alt: "alt", accessibilityLabel: "caller" });
    expect(m.label).toBe("caller");
  });

  it("never leaks an accessibility label onto the fallback frame", () => {
    expect(resolveProductMedia({ url: null, accessibilityLabel: "caller" }).label).toBeUndefined();
  });
});
