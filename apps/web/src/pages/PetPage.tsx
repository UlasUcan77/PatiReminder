import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { describeInterval, speciesValues, type Pet, type Vaccination } from "@patireminder/shared";
import { DoseList } from "../components/DoseList";
import { WeightChart } from "../components/WeightChart";
import { api } from "../lib/api";
import {
  addDays,
  dateInputToIso,
  dateTimeInputToIso,
  dueLabel,
  errorMessage,
  formatDate,
  isoToDateInput,
  isoToDateTimeInput,
  SPECIES_EMOJI,
  SPECIES_LABEL,
  startOfDay,
} from "../lib/format";
import { printHealthRecord } from "../lib/print";

const TABS = [
  ["ilaclar", "İlaçlar"],
  ["asilar", "Aşılar"],
  ["kilo", "Kilo"],
  ["ziyaretler", "Veteriner"],
] as const;
type Tab = (typeof TABS)[number][0];

export function PetPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("sekme") as Tab | null) ?? "ilaclar";
  const pet = useQuery({ queryKey: ["pets", id], queryFn: () => api.pet(id), retry: false });

  if (pet.isError) return <Navigate to="/" replace />;
  if (!pet.data) return <p className="muted">Yükleniyor…</p>;

  return (
    <>
      <PetHeader pet={pet.data} />
      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setParams({ sekme: key })}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "ilaclar" && <MedicationsTab petId={id} />}
      {tab === "asilar" && <VaccinationsTab petId={id} />}
      {tab === "kilo" && <WeightTab petId={id} />}
      {tab === "ziyaretler" && <VisitsTab petId={id} />}
    </>
  );
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

function PetHeader({ pet }: { pet: Pet }) {
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const update = useMutation({
    mutationFn: (input: Parameters<typeof api.updatePet>[1]) => api.updatePet(pet.id, input),
    onSuccess: () => {
      setEditing(false);
      void invalidate();
    },
  });
  const remove = useMutation({ mutationFn: () => api.deletePet(pet.id), onSuccess: () => navigate("/") });

  if (editing) {
    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      update.mutate({
        name: String(f.get("name")),
        species: f.get("species") as Pet["species"],
        breed: String(f.get("breed")),
        birthDate: dateInputToIso(String(f.get("birthDate"))),
      });
    };
    return (
      <form className="card stack" onSubmit={onSubmit}>
        <div className="row">
          <label>
            Adı
            <input name="name" defaultValue={pet.name} required />
          </label>
          <label>
            Tür
            <select name="species" defaultValue={pet.species}>
              {speciesValues.map((s) => (
                <option key={s} value={s}>
                  {SPECIES_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Irk
            <input name="breed" defaultValue={pet.breed ?? ""} />
          </label>
          <label>
            Doğum tarihi
            <input name="birthDate" type="date" defaultValue={isoToDateInput(pet.birthDate)} />
          </label>
        </div>
        {update.error && <p className="error">{errorMessage(update.error)}</p>}
        <div className="card-head">
          <div className="row" style={{ flex: 1 }}>
            <button className="primary" style={{ flex: "0 0 auto" }}>
              Kaydet
            </button>
            <button type="button" style={{ flex: "0 0 auto" }} onClick={() => setEditing(false)}>
              Vazgeç
            </button>
          </div>
          <button
            type="button"
            className="danger"
            onClick={() => confirm(`${pet.name} ve tüm kayıtları silinsin mi? Bu geri alınamaz.`) && remove.mutate()}
          >
            Sil
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card-head">
      <div>
        <h1>
          {SPECIES_EMOJI[pet.species]} {pet.name}
        </h1>
        <p className="muted">
          {[pet.breed ?? SPECIES_LABEL[pet.species], pet.birthDate && `Doğum: ${formatDate(pet.birthDate)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="actions">
        <button
          disabled={printing}
          onClick={async () => {
            setPrinting(true);
            await printHealthRecord(pet.id).finally(() => setPrinting(false));
          }}
        >
          Sağlık karnesi (PDF)
        </button>
        <button onClick={() => setEditing(true)}>Düzenle</button>
      </div>
    </div>
  );
}

function MedicationsTab({ petId }: { petId: string }) {
  const invalidate = useInvalidate();
  const today = startOfDay();
  const doses = useQuery({
    queryKey: ["doses", petId, today.toISOString()],
    queryFn: () => api.doses(today, addDays(today, 3), petId),
  });
  const meds = useQuery({ queryKey: ["medications", petId], queryFn: () => api.medications(petId) });
  const toggle = useMutation({
    mutationFn: (m: { id: string; active: boolean }) => api.updateMedication(m.id, { active: m.active }),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteMedication, onSuccess: invalidate });
  const create = useMutation({
    mutationFn: (input: Parameters<typeof api.createMedication>[1]) => api.createMedication(petId, input),
    onSuccess: invalidate,
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const endsAt = String(f.get("endsAt"));
    create.mutate(
      {
        name: String(f.get("name")),
        dosage: String(f.get("dosage")),
        intervalHours: Number(f.get("intervalHours")),
        startsAt: dateTimeInputToIso(String(f.get("startsAt"))),
        endsAt: endsAt ? dateTimeInputToIso(endsAt) : null,
        notes: String(f.get("notes")),
      },
      { onSuccess: () => form.reset() },
    );
  }

  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

  return (
    <div className="grid-2">
      <section className="card">
        <h2>Önümüzdeki 3 gün</h2>
        <DoseList doses={doses.data ?? []} emptyText="Planlanmış doz yok." />
      </section>

      <section className="card">
        <h2>İlaçlar</h2>
        {meds.data?.length ? (
          <ul className="list">
            {meds.data.map((m) => (
              <li key={m.id}>
                <div className="main">
                  <strong>{m.name}</strong>
                  <span className="muted small">
                    {m.dosage} · {describeInterval(m.intervalHours)} · {formatDate(m.startsAt)}
                    {m.endsAt ? ` – ${formatDate(m.endsAt)}` : ""}
                  </span>
                </div>
                <div className="actions">
                  <button className="small" onClick={() => toggle.mutate({ id: m.id, active: !m.active })}>
                    {m.active ? "Durdur" : "Devam et"}
                  </button>
                  <button
                    className="small danger"
                    onClick={() => confirm(`${m.name} ve doz geçmişi silinsin mi?`) && remove.mutate(m.id)}
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Kayıtlı ilaç yok.</p>
        )}

        <form className="stack" onSubmit={onSubmit}>
          <h3 className="small muted">Yeni ilaç</h3>
          <div className="row">
            <label>
              İlaç
              <input name="name" required placeholder="Örn. Antibiyotik" />
            </label>
            <label>
              Doz
              <input name="dosage" required placeholder="Örn. 1 tablet" />
            </label>
          </div>
          <div className="row">
            <label>
              Sıklık
              <select name="intervalHours" defaultValue="24">
                <option value="24">Her gün</option>
                <option value="12">Günde 2 kez</option>
                <option value="8">Günde 3 kez</option>
                <option value="48">2 günde bir</option>
                <option value="168">Haftada bir</option>
                <option value="720">30 günde bir</option>
              </select>
            </label>
            <label>
              İlk doz
              <input
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={isoToDateTimeInput(nextHour.toISOString())}
              />
            </label>
            <label>
              Bitiş (isteğe bağlı)
              <input name="endsAt" type="datetime-local" />
            </label>
          </div>
          <label>
            Not
            <input name="notes" placeholder="Örn. Yemekle birlikte" />
          </label>
          {create.error && <p className="error">{errorMessage(create.error)}</p>}
          <div>
            <button className="primary" disabled={create.isPending}>
              İlaç ekle
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function VaccinationsTab({ petId }: { petId: string }) {
  const invalidate = useInvalidate();
  const [replacing, setReplacing] = useState<Vaccination | null>(null);
  const vaccinations = useQuery({ queryKey: ["vaccinations", petId], queryFn: () => api.vaccinations(petId) });
  const remove = useMutation({ mutationFn: api.deleteVaccination, onSuccess: invalidate });
  const create = useMutation({
    mutationFn: (input: Parameters<typeof api.createVaccination>[1]) => api.createVaccination(petId, input),
    onSuccess: () => {
      setReplacing(null);
      void invalidate();
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    create.mutate(
      {
        name: String(f.get("name")),
        administeredAt: dateInputToIso(String(f.get("administeredAt"))),
        dueAt: dateInputToIso(String(f.get("dueAt"))),
        vetName: String(f.get("vetName")),
        notes: String(f.get("notes")),
        replacesId: replacing?.id,
      },
      { onSuccess: () => form.reset() },
    );
  }

  return (
    <div className="grid-2">
      <section className="card">
        <h2>Aşı kayıtları</h2>
        {vaccinations.data?.length ? (
          <ul className="list">
            {vaccinations.data.map((v) => {
              const due = v.dueAt ? dueLabel(v.dueAt) : null;
              return (
                <li key={v.id}>
                  <div className="main">
                    <strong>{v.name}</strong>
                    <span className="muted small">
                      {v.administeredAt ? `Yapıldı: ${formatDate(v.administeredAt)}` : "Henüz yapılmadı"}
                      {v.dueAt && ` · Sonraki: ${formatDate(v.dueAt)}`}
                      {v.vetName && ` · ${v.vetName}`}
                    </span>
                  </div>
                  <div className="actions">
                    {due && <span className={`badge ${due.tone}`}>{due.text}</span>}
                    {v.dueAt && (
                      <button className="small" onClick={() => setReplacing(v)}>
                        Yapıldı
                      </button>
                    )}
                    <button
                      className="small danger"
                      onClick={() => confirm(`${v.name} kaydı silinsin mi?`) && remove.mutate(v.id)}
                    >
                      Sil
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty">Kayıtlı aşı yok.</p>
        )}
      </section>

      <section className="card">
        <h2>{replacing ? `${replacing.name} yapıldı` : "Aşı ekle"}</h2>
        <p className="muted small">Tarihleri veterinerinizin söylediği gibi girin. Uygulama aşı takvimi önermez.</p>
        <form className="stack" onSubmit={onSubmit} key={replacing?.id ?? "new"}>
          <label>
            Aşı
            <input name="name" required defaultValue={replacing?.name ?? ""} placeholder="Örn. Kuduz" />
          </label>
          <div className="row">
            <label>
              Yapıldığı tarih
              <input
                name="administeredAt"
                type="date"
                defaultValue={replacing ? isoToDateInput(new Date().toISOString()) : ""}
              />
            </label>
            <label>
              Sonraki tarih
              <input name="dueAt" type="date" />
            </label>
          </div>
          <div className="row">
            <label>
              Veteriner
              <input name="vetName" />
            </label>
            <label>
              Not
              <input name="notes" />
            </label>
          </div>
          {create.error && <p className="error">{errorMessage(create.error)}</p>}
          <div className="row">
            <button className="primary" disabled={create.isPending} style={{ flex: "0 0 auto" }}>
              Kaydet
            </button>
            {replacing && (
              <button type="button" style={{ flex: "0 0 auto" }} onClick={() => setReplacing(null)}>
                Vazgeç
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

function WeightTab({ petId }: { petId: string }) {
  const invalidate = useInvalidate();
  const weights = useQuery({ queryKey: ["weights", petId], queryFn: () => api.weights(petId) });
  const add = useMutation({
    mutationFn: (input: Parameters<typeof api.addWeight>[1]) => api.addWeight(petId, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteWeight, onSuccess: invalidate });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    add.mutate(
      { kg: Number(String(f.get("kg")).replace(",", ".")), measuredAt: dateInputToIso(String(f.get("measuredAt")))! },
      { onSuccess: () => form.reset() },
    );
  }

  const entries = weights.data ?? [];
  return (
    <section className="card">
      <h2>Kilo</h2>
      <WeightChart entries={entries} />
      <form className="row" onSubmit={onSubmit}>
        <label>
          Kilo (kg)
          <input name="kg" inputMode="decimal" required placeholder="12,5" />
        </label>
        <label>
          Tarih
          <input name="measuredAt" type="date" required defaultValue={isoToDateInput(new Date().toISOString())} />
        </label>
        <button className="primary" disabled={add.isPending} style={{ flex: "0 0 auto" }}>
          Ekle
        </button>
      </form>
      {add.error && <p className="error">{errorMessage(add.error)}</p>}
      {entries.length ? (
        <ul className="list">
          {[...entries].reverse().map((w) => (
            <li key={w.id}>
              <div className="main">
                <strong>{w.kg} kg</strong>
                <span className="muted small">{formatDate(w.measuredAt)}</span>
              </div>
              <button className="small danger" onClick={() => remove.mutate(w.id)}>
                Sil
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Henüz ölçüm yok.</p>
      )}
    </section>
  );
}

function VisitsTab({ petId }: { petId: string }) {
  const invalidate = useInvalidate();
  const visits = useQuery({ queryKey: ["visits", petId], queryFn: () => api.visits(petId) });
  const add = useMutation({
    mutationFn: (input: Parameters<typeof api.addVisit>[1]) => api.addVisit(petId, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.deleteVisit, onSuccess: invalidate });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    add.mutate(
      {
        visitedAt: dateInputToIso(String(f.get("visitedAt")))!,
        clinic: String(f.get("clinic")),
        reason: String(f.get("reason")),
        notes: String(f.get("notes")),
      },
      { onSuccess: () => form.reset() },
    );
  }

  return (
    <div className="grid-2">
      <section className="card">
        <h2>Veteriner ziyaretleri</h2>
        {visits.data?.length ? (
          <ul className="list">
            {visits.data.map((v) => (
              <li key={v.id}>
                <div className="main">
                  <strong>{v.reason ?? "Ziyaret"}</strong>
                  <span className="muted small">{[formatDate(v.visitedAt), v.clinic].filter(Boolean).join(" · ")}</span>
                  {v.notes && <span className="small">{v.notes}</span>}
                </div>
                <button className="small danger" onClick={() => remove.mutate(v.id)}>
                  Sil
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Kayıtlı ziyaret yok.</p>
        )}
      </section>
      <section className="card">
        <h2>Ziyaret ekle</h2>
        <form className="stack" onSubmit={onSubmit}>
          <div className="row">
            <label>
              Tarih
              <input name="visitedAt" type="date" required defaultValue={isoToDateInput(new Date().toISOString())} />
            </label>
            <label>
              Klinik
              <input name="clinic" />
            </label>
          </div>
          <label>
            Sebep
            <input name="reason" placeholder="Örn. Yıllık kontrol" />
          </label>
          <label>
            Notlar
            <textarea name="notes" rows={3} />
          </label>
          {add.error && <p className="error">{errorMessage(add.error)}</p>}
          <div>
            <button className="primary" disabled={add.isPending}>
              Kaydet
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
