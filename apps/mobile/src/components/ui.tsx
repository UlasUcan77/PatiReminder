// Small set of building blocks so every screen looks the same in light and
// dark mode without a UI library.
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useColors } from "./theme";

export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const c = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, title, right }: { children: ReactNode; title?: string; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      {(title || right) && (
        <View style={styles.cardHead}>
          {title && <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text>}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function T({
  children,
  muted,
  small,
  bold,
  size,
  center,
}: {
  children: ReactNode;
  muted?: boolean;
  small?: boolean;
  bold?: boolean;
  size?: number;
  center?: boolean;
}) {
  const c = useColors();
  return (
    <Text
      style={{
        color: muted ? c.muted : c.text,
        fontSize: size ?? (small ? 13 : 15),
        fontWeight: bold ? "600" : "400",
        textAlign: center ? "center" : "left",
      }}
    >
      {children}
    </Text>
  );
}

type ButtonKind = "primary" | "secondary" | "danger";

export function Button({
  title,
  onPress,
  kind = "secondary",
  disabled,
  loading,
  small,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  const c = useColors();
  const primary = kind === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: primary ? c.accent : c.surface,
          borderColor: primary ? c.accent : c.border,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? c.accentText : c.text} />
      ) : (
        <Text
          style={{
            color: primary ? c.accentText : kind === "danger" ? c.danger : c.text,
            fontWeight: "600",
            fontSize: small ? 13 : 15,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
      />
    </View>
  );
}

export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <View style={styles.chips}>
        {options.map(([key, text]) => {
          const active = key === value;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentSoft : c.surface },
              ]}
            >
              <Text style={{ color: active ? c.accent : c.text, fontWeight: active ? "600" : "400" }}>{text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const formatPicked = (d: Date, mode: "date" | "datetime") =>
  d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) +
  (mode === "datetime" ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : "");

/**
 * Date (and optional time) picker. Android shows the date and the time as two
 * dialogs one after the other; iOS shows one inline picker.
 */
export function DateField({
  label,
  value,
  onChange,
  mode = "date",
  optional,
}: {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  mode?: "date" | "datetime";
  optional?: boolean;
}) {
  const c = useColors();
  const [picking, setPicking] = useState<"date" | "time" | null>(null);

  function handle(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === "android") setPicking(null);
    if (event.type !== "set" || !picked) return;
    onChange(picked);
    if (Platform.OS === "android" && mode === "datetime" && picking === "date") setPicking("time");
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <View style={styles.dateRow}>
        <Pressable
          onPress={() => setPicking(picking ? null : "date")}
          style={[styles.input, styles.dateButton, { backgroundColor: c.bg, borderColor: c.border }]}
        >
          <Text style={{ color: value ? c.text : c.muted, fontSize: 15 }}>
            {value ? formatPicked(value, mode) : "Seçin"}
          </Text>
        </Pressable>
        {optional && value && <Button small title="Temizle" onPress={() => onChange(null)} />}
      </View>
      {picking && (
        <DateTimePicker
          value={value ?? new Date()}
          mode={Platform.OS === "ios" ? mode : picking}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handle}
          locale="tr-TR"
        />
      )}
    </View>
  );
}

export function Badge({ text, tone }: { text: string; tone: "ok" | "warn" | "danger" | "muted" }) {
  const c = useColors();
  const palette = {
    ok: [c.accentSoft, c.accent],
    warn: [c.warnSoft, c.warn],
    danger: [c.dangerSoft, c.danger],
    muted: [c.bg, c.muted],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette[0] }]}>
      <Text style={{ color: palette[1], fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export function Row({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const c = useColors();
  const content = <View style={[styles.row, { borderTopColor: c.border }]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = useColors();
  return children ? <Text style={{ color: c.danger, fontSize: 14 }}>{children}</Text> : null;
}

export function Empty({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.muted, fontStyle: "italic" }}>{children}</Text>;
}

export const styles = StyleSheet.create({
  screen: { padding: 16, gap: 16, paddingBottom: 48 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSmall: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  field: { gap: 6 },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateButton: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  badge: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
