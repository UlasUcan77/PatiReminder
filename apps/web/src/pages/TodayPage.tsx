import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { speciesValues } from "@patireminder/shared";
import { DoseList } from "../components/DoseList";
import { api } from "../lib/api";
import {
  addDays,
  dateInputToIso,
  dueLabel,
  errorMessage,
  formatDate,
  SPECIES_EMOJI,
  SPECIES_LABEL,
  startOfDay,
} from "../lib/format";

export function TodayPage() {
  const today = startOfDay();
  const pets = useQuery({ queryKey: ["pets"], queryFn: api.pets });
  const doses = useQuery({
    queryKey: ["doses", "today", today.toISOString()],
    queryFn: () => api.doses(today, addDays(today, 1)),
  });
  const upcoming = useQuery({ queryKey: ["vaccinations", "upcoming"], queryFn: () => api.upcomingVaccinations(60) });

  const pending = doses.data?.filter((d) => d.status === "PENDING").length ?? 0;

  return (
    <>
      <div>
        <h1>Bugün</h1>
        <p className="muted">
          {today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
          {doses.data && ` · ${pending ? `${pending} doz bekliyor` : "bekleyen doz yok"}`}
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>İlaçlar</h2>
          {doses.isLoading ? (
            <p className="muted">Yükleniyor…</p>
          ) : (
            <DoseList doses={doses.data ?? []} showPet emptyText="Bugün verilecek ilaç yok." />
          )}
        </section>

        <section className="card">
          <h2>Yaklaşan aşılar</h2>
          {upcoming.data?.length ? (
            <ul className="list">
              {upcoming.data.map((v) => {
                const due = dueLabel(v.dueAt!);
                return (
                  <li key={v.id}>
                    <div className="main">
                      <Link to={`/hayvan/${v.petId}?sekme=asilar`}>
                        <strong>
                          {v.petName} · {v.name}
                        </strong>
                      </Link>
                      <span className="muted small">{formatDate(v.dueAt)}</span>
                    </div>
                    <span className={`badge ${due.tone}`}>{due.text}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty">Önümüzdeki 60 günde aşı yok.</p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Hayvanlarım</h2>
        </div>
        {pets.data?.length ? (
          <div className="pets">
            {pets.data.map((pet) => (
              <Link key={pet.id} to={`/hayvan/${pet.id}`} className="pet-card">
                <span className="emoji">{SPECIES_EMOJI[pet.species]}</span>
                <strong>{pet.name}</strong>
                <span className="muted small">{pet.breed ?? SPECIES_LABEL[pet.species]}</span>
              </Link>
            ))}
          </div>
        ) : (
          !pets.isLoading && <p className="empty">Henüz hayvan eklemediniz.</p>
        )}
        <AddPetForm />
      </section>
    </>
  );
}

function AddPetForm() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: api.createPet,
    onSuccess: (pet) => navigate(`/hayvan/${pet.id}`),
  });

  if (!open) return <button onClick={() => setOpen(true)}>+ Hayvan ekle</button>;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      name: String(f.get("name")),
      species: f.get("species") as (typeof speciesValues)[number],
      breed: String(f.get("breed")),
      birthDate: dateInputToIso(String(f.get("birthDate"))),
    });
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="row">
        <label>
          Adı
          <input name="name" required autoFocus />
        </label>
        <label>
          Tür
          <select name="species" defaultValue="DOG">
            {speciesValues.map((s) => (
              <option key={s} value={s}>
                {SPECIES_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Irk
          <input name="breed" />
        </label>
        <label>
          Doğum tarihi
          <input name="birthDate" type="date" />
        </label>
      </div>
      {create.error && <p className="error">{errorMessage(create.error)}</p>}
      <div className="row">
        <button className="primary" disabled={create.isPending} style={{ flex: "0 0 auto" }}>
          Kaydet
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ flex: "0 0 auto" }}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}
