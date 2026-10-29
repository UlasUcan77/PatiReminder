import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Household, Invite } from "@patireminder/shared";
import { api } from "../lib/api";
import { errorMessage, formatDate } from "../lib/format";

export function FamilyPage() {
  const queryClient = useQueryClient();
  const households = useQuery({ queryKey: ["households"], queryFn: api.households });
  const join = useMutation({
    mutationFn: api.joinHousehold,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  function onJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    join.mutate(String(new FormData(form).get("code")), { onSuccess: () => form.reset() });
  }

  return (
    <>
      <div>
        <h1>Aile</h1>
        <p className="muted">Aynı evdeki herkes aynı hayvanları görür ve kim hangi dozu verdi anında öğrenir.</p>
      </div>
      {households.data?.map((h) => (
        <HouseholdCard key={h.id} household={h} canLeave={households.data.length > 1} />
      ))}
      <section className="card">
        <h2>Bir eve katıl</h2>
        <form className="row" onSubmit={onJoin}>
          <label>
            Davet kodu
            <input name="code" required maxLength={6} placeholder="ABC123" style={{ textTransform: "uppercase" }} />
          </label>
          <button className="primary" disabled={join.isPending} style={{ flex: "0 0 auto" }}>
            Katıl
          </button>
        </form>
        {join.error && <p className="error">{errorMessage(join.error)}</p>}
        {join.isSuccess && <p className="small">{join.data.name} evine katıldınız.</p>}
      </section>
    </>
  );
}

function HouseholdCard({ household, canLeave }: { household: Household; canLeave: boolean }) {
  const queryClient = useQueryClient();
  const [invite, setInvite] = useState<Invite | null>(null);
  const createInvite = useMutation({ mutationFn: () => api.createInvite(household.id), onSuccess: setInvite });
  const leave = useMutation({
    mutationFn: () => api.leaveHousehold(household.id),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <section className="card">
      <div className="card-head">
        <h2>{household.name}</h2>
        {canLeave && (
          <button
            className="small danger"
            onClick={() => confirm(`${household.name} evinden ayrılmak istiyor musunuz?`) && leave.mutate()}
          >
            Evden ayrıl
          </button>
        )}
      </div>
      <ul className="list">
        {household.members.map((m) => (
          <li key={m.id}>
            <div className="main">
              <strong>{m.name}</strong>
            </div>
            <span className={`badge ${m.role === "OWNER" ? "ok" : "muted"}`}>
              {m.role === "OWNER" ? "Ev sahibi" : "Üye"}
            </span>
          </li>
        ))}
      </ul>
      {invite ? (
        <div>
          <p className="muted small">
            Bu kodu aile üyenize gönderin. {formatDate(invite.expiresAt)} tarihine kadar geçerli.
          </p>
          <p className="code">{invite.code}</p>
        </div>
      ) : (
        <div>
          <button onClick={() => createInvite.mutate()} disabled={createInvite.isPending}>
            Davet kodu oluştur
          </button>
        </div>
      )}
      {leave.error && <p className="error">{errorMessage(leave.error)}</p>}
    </section>
  );
}
