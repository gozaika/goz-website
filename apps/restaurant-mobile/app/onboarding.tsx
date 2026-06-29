import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, EmptyState, ErrorState, Screen, Text, palette, spacing, toneColors } from "@gozaika/mobile-ui";
import type { OnboardingStep, OnboardingTask } from "@gozaika/types";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useOnboarding, useSetOnboardingTask } from "@/api/onboarding";
import { useAuth } from "@/auth/useAuth";

function taskTone(statusCode: string) {
  switch (statusCode) {
    case "COMPLETED":
    case "WAIVED":
      return "success" as const;
    case "IN_PROGRESS":
      return "info" as const;
    case "BLOCKED":
      return "danger" as const;
    default:
      return "warning" as const;
  }
}

function ProgressBar({ done, total }: { readonly done: number; readonly total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="label">{`${done} of ${total} steps done`}</Text>
        <Text variant="label" color={palette.forest}>{`${pct}%`}</Text>
      </View>
      <View style={{ height: 10, borderRadius: 6, backgroundColor: palette.border, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: 10, backgroundColor: palette.forest }} />
      </View>
    </View>
  );
}

function StepRow({ step, onOpen }: { readonly step: OnboardingStep; readonly onOpen: (route: string) => void }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{step.title}</Text>
          <Text variant="caption" color={palette.muted}>
            {step.detail}
          </Text>
        </View>
        <Badge label={step.done ? "Done" : "To do"} tone={step.done ? "success" : "warning"} />
      </View>
      {!step.done && step.routePath ? (
        <Button label="Open" variant="secondary" accent={palette.forest} onPress={() => onOpen(step.routePath as string)} />
      ) : null}
    </Card>
  );
}

function TaskRow({
  task,
  canManage,
  pendingCode,
  onSet,
}: {
  readonly task: OnboardingTask;
  readonly canManage: boolean;
  readonly pendingCode: string | null;
  readonly onSet: (taskCode: string, statusCode: "PENDING" | "IN_PROGRESS" | "COMPLETED") => void;
}) {
  const busy = pendingCode === task.taskCode;
  const completed = task.statusCode === "COMPLETED" || task.statusCode === "WAIVED";
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
        <Text variant="heading" style={{ flex: 1 }}>
          {task.taskName}
        </Text>
        <Badge label={task.statusCode.replaceAll("_", " ")} tone={taskTone(task.statusCode)} />
      </View>
      {canManage ? (
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          {task.statusCode === "PENDING" ? (
            <Button label="Start" variant="ghost" accent={palette.forest} loading={busy} onPress={() => onSet(task.taskCode, "IN_PROGRESS")} />
          ) : null}
          {!completed ? (
            <Button label="Mark done" variant="secondary" accent={palette.forest} loading={busy} onPress={() => onSet(task.taskCode, "COMPLETED")} />
          ) : (
            <Button label="Reopen" variant="ghost" accent={palette.forest} loading={busy} onPress={() => onSet(task.taskCode, "PENDING")} />
          )}
        </View>
      ) : null}
    </Card>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { selectedRestaurantPk } = useAuth();
  const { data, isLoading, isError, error, refetch } = useOnboarding(selectedRestaurantPk);
  const setTask = useSetOnboardingTask(selectedRestaurantPk);

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home to view onboarding." />
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
  if (isError || !data) {
    return (
      <Screen>
        <ErrorState message={error instanceof ApiError ? error.message : "Could not load onboarding."} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const allDone = data.completedSteps === data.totalSteps;
  const pendingCode = setTask.isPending ? (setTask.variables?.taskCode ?? null) : null;

  return (
    <Screen>
      <Text variant="title">Onboarding</Text>
      <Text variant="caption" color={palette.muted}>
        {data.restaurantName} · {data.statusCode.replaceAll("_", " ")}
      </Text>

      <Card>
        <ProgressBar done={data.completedSteps} total={data.totalSteps} />
        <Text variant="caption" color={palette.muted}>
          {allDone
            ? "All setup steps are complete. Your activation is reviewed by the goZaika team."
            : "Pick up where you left off — your progress is saved."}
        </Text>
      </Card>

      <Text variant="heading">Setup steps</Text>
      {data.steps.map((step) => (
        <StepRow key={step.key} step={step} onOpen={(route) => router.push(route as never)} />
      ))}

      {data.tasks.length ? (
        <>
          <Text variant="heading">Operational tasks</Text>
          {data.tasks.map((task) => (
            <TaskRow key={task.taskCode} task={task} canManage={data.canManage} pendingCode={pendingCode} onSet={(c, s) => setTask.mutate({ taskCode: c, statusCode: s })} />
          ))}
        </>
      ) : null}

      {setTask.isError ? (
        <View style={{ backgroundColor: toneColors("danger").bg, borderRadius: 10, padding: 12 }}>
          <Text variant="caption" color={toneColors("danger").fg}>
            {setTask.error instanceof ApiError ? setTask.error.message : "Could not update the task."}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
