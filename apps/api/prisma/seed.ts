// Fills a local database with a demo household, so the apps have something to
// show right away. Run with `npm run db:seed`. Local development only.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Demo accounts for local development. Not used anywhere else.
const DEMO_PASSWORD = "pati-demo-1234";
const DEMO_USERS = [
  { name: "Ulaş", email: "demo@patireminder.test" },
  { name: "Ayşe", email: "ayse@patireminder.test" },
];

const DAY = 86400000;
const days = (n: number) => new Date(Date.now() + n * DAY);
const todayAt = (hour: number) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  await prisma.user.deleteMany({ where: { email: { in: DEMO_USERS.map((u) => u.email) } } });
  await prisma.household.deleteMany({ where: { name: "Demo evi" } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const household = await prisma.household.create({ data: { name: "Demo evi" } });
  const [ulas, ayse] = await Promise.all(
    DEMO_USERS.map((u, i) =>
      prisma.user.create({
        data: {
          ...u,
          passwordHash,
          memberships: { create: { householdId: household.id, role: i === 0 ? "OWNER" : "MEMBER" } },
        },
      }),
    ),
  );

  const boncuk = await prisma.pet.create({
    data: {
      householdId: household.id,
      name: "Boncuk",
      species: "DOG",
      breed: "Golden Retriever",
      birthDate: new Date("2021-05-14"),
    },
  });
  const tekir = await prisma.pet.create({
    data: { householdId: household.id, name: "Tekir", species: "CAT", birthDate: new Date("2023-03-02") },
  });

  const antibiotic = await prisma.medication.create({
    data: {
      petId: boncuk.id,
      name: "Antibiyotik",
      dosage: "1 tablet",
      intervalHours: 12,
      startsAt: todayAt(8),
      endsAt: days(6),
      notes: "Yemekle birlikte",
    },
  });
  await prisma.medicationDose.create({
    data: {
      medicationId: antibiotic.id,
      scheduledFor: todayAt(8),
      status: "GIVEN",
      givenAt: todayAt(8),
      givenById: ayse.id,
    },
  });
  await prisma.medication.create({
    data: {
      petId: tekir.id,
      name: "Göz damlası",
      dosage: "2 damla",
      intervalHours: 24,
      startsAt: todayAt(21),
      endsAt: days(10),
    },
  });

  await prisma.vaccination.createMany({
    data: [
      { petId: boncuk.id, name: "Kuduz", administeredAt: days(-360), dueAt: days(5), vetName: "Pati Klinik" },
      { petId: boncuk.id, name: "Karma (DHPPi)", administeredAt: days(-200), dueAt: days(165) },
      { petId: tekir.id, name: "Karma (FVRCP)", administeredAt: days(-370), dueAt: days(-5) },
    ],
  });
  await prisma.weightEntry.createMany({
    data: [
      { petId: boncuk.id, kg: 28.4, measuredAt: days(-180) },
      { petId: boncuk.id, kg: 29.1, measuredAt: days(-90) },
      { petId: boncuk.id, kg: 30.2, measuredAt: days(-10) },
    ],
  });
  await prisma.vetVisit.create({
    data: {
      petId: boncuk.id,
      visitedAt: days(-10),
      clinic: "Pati Klinik",
      reason: "Yıllık kontrol",
      notes: "Kilo ideal sınırda.",
    },
  });

  console.log(`Seeded "Demo evi": sign in as ${ulas.email} or ${ayse.email} (password in prisma/seed.ts).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
