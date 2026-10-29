import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Redirect } from "expo-router";
import { errorMessage } from "@patireminder/shared";
import { Button, Card, ErrorText, Field, Screen, T } from "@/components/ui";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const { user, signIn } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Redirect href="/" />;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const auth =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({
              name,
              email,
              password,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
      await signIn(auth);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ gap: 4, paddingTop: 64 }}>
          <T size={30} bold>
            🐾 PatiReminder
          </T>
          <T muted>Aşıları ve ilaçları ailecek takip edin.</T>
        </View>
        <Card>
          {mode === "register" && (
            <Field label="Adınız" value={name} onChangeText={setName} autoComplete="given-name" />
          )}
          <Field
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          <ErrorText>{error}</ErrorText>
          <Button
            kind="primary"
            title={mode === "login" ? "Giriş yap" : "Hesap oluştur"}
            onPress={submit}
            loading={busy}
          />
          <Button
            title={mode === "login" ? "Hesabım yok, kayıt ol" : "Zaten hesabım var"}
            onPress={() => {
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
          />
        </Card>
        {__DEV__ && (
          <T small muted center>
            API: {API_URL}
          </T>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
