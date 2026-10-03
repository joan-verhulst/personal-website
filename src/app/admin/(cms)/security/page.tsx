import type { Metadata } from "next";
import Authenticators from "~/modules/cms/components/two-factor/authenticators";
import { adminClient, adminUser } from "~/modules/cms/utils/require-admin";
import { MISSING_FUNCTION } from "~/modules/cms/utils/shared";
import { verifiedFactors } from "~/modules/cms/utils/two-factor";

export const metadata: Metadata = { title: "Security" };

// Formatted here, so the server and the browser can't disagree on the day
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SecurityAdmin = async () => {
  const [user, supabase] = await Promise.all([adminUser(), adminClient()]);

  // Only the ones that were confirmed with a code. A setup that was left
  // halfway isn't an authenticator
  const authenticators = verifiedFactors(user).map((factor) => ({
    id: factor.id,
    name: factor.friendly_name || "Authenticator",
    added: dateFormat.format(new Date(factor.created_at)),
  }));

  // supabase/migrations/0004_two_factor.sql adds this function along with
  // the database's own check. It's run by hand, so without a reminder a
  // forgotten run would leave the database open to a password alone
  const { data: isEnforced, error } = await supabase.rpc("two_factor_enforced");
  // Any other error says nothing about the migration, so the page stays quiet
  if (error && error.code !== MISSING_FUNCTION) console.error(error);
  const needsMigration = error
    ? error.code === MISSING_FUNCTION
    : isEnforced !== true;

  return (
    <Authenticators
      authenticators={authenticators}
      needsMigration={needsMigration}
    />
  );
};

export default SecurityAdmin;
