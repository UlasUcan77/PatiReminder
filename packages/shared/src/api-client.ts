// A small typed wrapper around fetch, used by both the web panel and the
// mobile app so they call the API the same way.
import type { z } from "zod";
import type { AuthResponse, LoginInput, PublicUser, RegisterInput } from "./auth";
import type {
  DoseInput,
  MedicationInput,
  PetInput,
  VaccinationInput,
  VetVisitInput,
  WeightInput,
  medicationUpdateSchema,
  petUpdateSchema,
  vaccinationUpdateSchema,
} from "./schemas";
import type {
  DoseSlot,
  HealthRecord,
  Household,
  Invite,
  Medication,
  Pet,
  UpcomingVaccination,
  Vaccination,
  VetVisit,
  WeightEntry,
} from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

type DateLike = Date | string;
type Body = Record<string, unknown>;

const toJson = (input: object): Body =>
  JSON.parse(JSON.stringify(input, (_k, v) => (v instanceof Date ? v.toISOString() : v)));

export function createApiClient(options: {
  baseUrl: string;
  getToken: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}) {
  async function request<T>(method: string, path: string, body?: object): Promise<T> {
    const token = await options.getToken();
    const res = await fetch(`${options.baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(toJson(body)) : undefined,
    });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401 && token) options.onUnauthorized?.();
      const message = (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
      throw new ApiError(res.status, message, data);
    }
    return data as T;
  }

  const get = <T>(path: string) => request<T>("GET", path);
  const post = <T>(path: string, body?: object) => request<T>("POST", path, body ?? {});
  const patch = <T>(path: string, body: object) => request<T>("PATCH", path, body);
  const del = (path: string) => request<void>("DELETE", path);
  const range = (from: DateLike, to: DateLike) =>
    `from=${encodeURIComponent(new Date(from).toISOString())}&to=${encodeURIComponent(new Date(to).toISOString())}`;

  return {
    register: (input: RegisterInput) => post<AuthResponse>("/auth/register", input),
    login: (input: LoginInput) => post<AuthResponse>("/auth/login", input),
    me: () => get<PublicUser>("/auth/me"),

    households: () => get<Household[]>("/households"),
    renameHousehold: (id: string, name: string) => patch<Household>(`/households/${id}`, { name }),
    createInvite: (id: string) => post<Invite>(`/households/${id}/invites`),
    joinHousehold: (code: string) => post<Household>("/households/join", { code }),
    leaveHousehold: (id: string) => del(`/households/${id}/membership`),

    pets: () => get<Pet[]>("/pets"),
    pet: (id: string) => get<Pet>(`/pets/${id}`),
    createPet: (input: PetInput) => post<Pet>("/pets", input),
    updatePet: (id: string, input: z.input<typeof petUpdateSchema>) => patch<Pet>(`/pets/${id}`, input),
    deletePet: (id: string) => del(`/pets/${id}`),
    healthRecord: (id: string) => get<HealthRecord>(`/pets/${id}/record`),

    vaccinations: (petId: string) => get<Vaccination[]>(`/pets/${petId}/vaccinations`),
    createVaccination: (petId: string, input: VaccinationInput) =>
      post<Vaccination>(`/pets/${petId}/vaccinations`, input),
    updateVaccination: (id: string, input: z.input<typeof vaccinationUpdateSchema>) =>
      patch<Vaccination>(`/vaccinations/${id}`, input),
    deleteVaccination: (id: string) => del(`/vaccinations/${id}`),
    upcomingVaccinations: (days = 60) => get<UpcomingVaccination[]>(`/vaccinations/upcoming?days=${days}`),

    medications: (petId: string) => get<Medication[]>(`/pets/${petId}/medications`),
    createMedication: (petId: string, input: MedicationInput) =>
      post<Medication>(`/pets/${petId}/medications`, input),
    updateMedication: (id: string, input: z.input<typeof medicationUpdateSchema>) =>
      patch<Medication>(`/medications/${id}`, input),
    deleteMedication: (id: string) => del(`/medications/${id}`),

    doses: (from: DateLike, to: DateLike, petId?: string) =>
      get<DoseSlot[]>(`/doses?${range(from, to)}${petId ? `&petId=${petId}` : ""}`),
    recordDose: (medicationId: string, input: DoseInput) =>
      post<DoseSlot>(`/medications/${medicationId}/doses`, input),
    undoDose: (doseId: string) => del(`/doses/${doseId}`),

    weights: (petId: string) => get<WeightEntry[]>(`/pets/${petId}/weights`),
    addWeight: (petId: string, input: WeightInput) => post<WeightEntry>(`/pets/${petId}/weights`, input),
    deleteWeight: (id: string) => del(`/weights/${id}`),

    visits: (petId: string) => get<VetVisit[]>(`/pets/${petId}/visits`),
    addVisit: (petId: string, input: VetVisitInput) => post<VetVisit>(`/pets/${petId}/visits`, input),
    deleteVisit: (id: string) => del(`/visits/${id}`),

    registerPushToken: (token: string, platform: "ios" | "android" | "web") =>
      post<void>("/push-tokens", { token, platform }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
