import { Prisma } from "@prisma/client";
import { getPercentageFromCounts } from "lib/plus";
import { userBasicSelection } from "lib/prisma";
import prisma from "prisma/client";

export type VotingSummariesByMonthAndTier = Prisma.PromiseReturnType<
  typeof getVotingSummariesByMonthAndTier
>;

const getVotingSummariesByMonthAndTier = async ({
  tier,
  year,
  month,
}: {
  tier: 1 | 2;
  year: number;
  month: number;
}) => {
  const summaries = await prisma.plusVotingSummary.findMany({
    where: { tier, year, month },
    select: {
      countsEU: true,
      wasSuggested: true,
      wasVouched: true,
      countsNA: true,
      user: {
        select: {
          ...userBasicSelection,
          plusStatus: {
            select: {
              region: true,
            },
          },
        },
      },
    },
  });

  return summaries
    .map((summary) => {
      // sometimes user can change their region. This flips the user region if it is noticed that
      // they received -2 or +2 from the opposite region. Sometimes user can still have wrong
      // region after this func has ran but this is ok.
      const fixUserRegionIfNeeded = () => {
        const region = summary.user.plusStatus?.region ?? "NA";
        if (
          region === "NA" &&
          (summary.countsEU[0] !== 0 || summary.countsEU[3] !== 0)
        )
          return "EU";
        if (
          region === "EU" &&
          (summary.countsNA[0] !== 0 || summary.countsNA[3] !== 0)
        )
          return "NA";

        return region;
      };

      return {
        ...summary,
        regionForVoting: fixUserRegionIfNeeded(),
        percentage: getPercentageFromCounts(
          summary.countsNA,
          summary.countsEU,
          fixUserRegionIfNeeded()
        ),
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .map((summary) => ({
      ...summary,
      percentage: parseFloat(summary.percentage.toFixed(1)),
    }));
};

const getMostRecentVotingWithResultsMonth = async () => {
  const mostRecent = await prisma.plusVotingSummary.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  if (!mostRecent)
    throw Error(
      "unexpected null mostRecent in getMostRecentVotingWithResultsMonth"
    );

  return { year: mostRecent.year, month: mostRecent.month };
};

export type DistinctSummaryMonths = Prisma.PromiseReturnType<
  typeof getDistinctSummaryMonths
>;

const getDistinctSummaryMonths = () => {
  return prisma.plusVotingSummary.findMany({
    distinct: ["month", "year", "tier"],
    select: { month: true, year: true, tier: true },
    orderBy: [{ year: "desc" }, { month: "desc" }, { tier: "asc" }],
  });
};

const addSuggestion = async ({
  data,
  userId,
}: {
  data: Prisma.PlusSuggestionUncheckedCreateInput;
  userId: number;
}) => {
  const existingSuggestion = await prisma.plusSuggestion.findUnique({
    where: { tier_suggestedId_suggesterId: data },
  });

  // every user can only send one new suggestion per month
  if (!existingSuggestion) {
    const usersSuggestion = await prisma.plusSuggestion.findFirst({
      where: { isResuggestion: false, suggesterId: userId },
    });
    if (usersSuggestion) {
      throw Error("Already made a new suggestion");
    }
  }

  return prisma.plusSuggestion.create({
    data: { ...data, isResuggestion: !!existingSuggestion },
  });
};

export default {
  getVotingSummariesByMonthAndTier,
  getMostRecentVotingWithResultsMonth,
  getDistinctSummaryMonths,
  addSuggestion,
};
