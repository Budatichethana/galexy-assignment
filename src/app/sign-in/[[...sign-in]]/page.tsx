import { SignIn } from "@clerk/nextjs";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveRedirectUrl(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return null;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectUrl = resolveRedirectUrl(resolvedSearchParams.redirect_url);
  const redirectTarget = redirectUrl || "/node";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <SignIn fallbackRedirectUrl="/node" forceRedirectUrl={redirectTarget} />
    </main>
  );
}
