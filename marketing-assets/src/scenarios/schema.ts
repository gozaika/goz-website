import { z } from "zod";

export const marketingSurfaceSchema = z.enum(["customer", "restaurant", "website", "store"]);
export type MarketingSurface = z.infer<typeof marketingSurfaceSchema>;

export const appSurfaceSchema = z.enum([
  "consumer-web",
  "consumer-mobile",
  "restaurant-web",
  "restaurant-mobile",
  "website",
]);
export type AppSurface = z.infer<typeof appSurfaceSchema>;

export const captureKindSchema = z.enum(["web", "mobile", "static-reference"]);
export const plannedOutputSurfaceSchema = z.enum([
  "website",
  "app-store",
  "restaurant-sales",
  "social",
  "tradeshow",
]);

export const reviewPassSchema = z.enum(["v1-functional", "v2-polished", "v3-launch-grade"]);

export const marketingScenarioSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(6),
    surface: marketingSurfaceSchema,
    persona: z.string().min(3),
    app: appSurfaceSchema,
    storyRole: z.string().min(3),
    sourceTruth: z
      .object({
        demoData: z.array(z.string().min(3)).min(1),
        verifiedRoutes: z.array(z.string().min(1)).min(1),
        requiredProof: z.array(z.string().min(3)).min(1),
        blockedIfMissing: z.array(z.string().min(3)).default([]),
      })
      .strict(),
    captures: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            kind: captureKindSchema,
            app: appSurfaceSchema.optional(),
            route: z.string().min(1).optional(),
            flow: z.string().min(1).optional(),
            viewport: z.string().min(2).optional(),
            sourceOfTruth: z.string().min(3),
          })
          .strict()
          .refine((capture) => Boolean(capture.route ?? capture.flow), {
            message: "Capture must declare either a route or a flow.",
          })
          .refine((capture) => capture.kind !== "web" || ["consumer-web", "restaurant-web", "website"].includes(capture.app ?? ""), {
            message: "Web captures must declare app as website, consumer-web, or restaurant-web.",
          }),
      )
      .min(1),
    copy: z
      .object({
        headline: z.string().min(3).max(70),
        subhead: z.string().min(3).max(120).optional(),
        labels: z.array(z.string().min(1).max(48)).default([]),
        languageBoundary: z.enum(["customer-only", "restaurant-only", "neutral"]),
      })
      .strict(),
    plannedOutputs: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            surface: plannedOutputSurfaceSchema,
            preset: z.string().min(3),
            passTarget: reviewPassSchema,
          })
          .strict(),
      )
      .min(1),
    truthGuards: z.array(z.string().min(3)).min(1),
    review: z
      .object({
        requiredPasses: z.tuple([
          z.literal("v1-functional"),
          z.literal("v2-polished"),
          z.literal("v3-launch-grade"),
        ]),
        creativeReviewRequired: z.literal(true),
      })
      .strict(),
  })
  .strict()
  .superRefine((scenario, context) => {
    const hasAppStoreOutput = scenario.plannedOutputs.some((output) => output.surface === "app-store");
    const hasTradeOrRestaurantOutput = scenario.plannedOutputs.some((output) =>
      ["restaurant-sales", "tradeshow"].includes(output.surface),
    );

    if (scenario.surface === "customer" && scenario.copy.languageBoundary !== "customer-only") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["copy", "languageBoundary"],
        message: "Customer scenarios must use customer-only language.",
      });
    }

    if (scenario.surface === "restaurant" && scenario.copy.languageBoundary !== "restaurant-only") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["copy", "languageBoundary"],
        message: "Restaurant scenarios must use restaurant-only language.",
      });
    }

    if (hasAppStoreOutput && !["consumer-mobile", "restaurant-mobile"].includes(scenario.app)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plannedOutputs"],
        message: "App-store outputs must originate from a mobile app surface.",
      });
    }

    if (scenario.surface === "customer" && hasTradeOrRestaurantOutput) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plannedOutputs"],
        message: "Customer scenarios cannot directly map to restaurant-sales or tradeshow outputs.",
      });
    }
  });

export type MarketingScenario = z.infer<typeof marketingScenarioSchema>;

export const exportPresetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    surface: plannedOutputSurfaceSchema,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: z.enum(["png", "jpg", "mp4"]),
    safeMarginPx: z.number().int().nonnegative(),
    notes: z.string().min(3),
  })
  .strict();

export const exportPresetsFileSchema = z.object({
  presets: z.array(exportPresetSchema).min(1),
});

export const assetCatalogFileSchema = z.object({
  version: z.literal(1),
  assets: z.array(
    z
      .object({
        id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        scenarioId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        outputId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        status: z.enum(["planned", "v1-functional", "v2-polished", "v3-launch-grade"]),
        reviewPath: z.string().min(3),
      })
      .strict(),
  ),
});
