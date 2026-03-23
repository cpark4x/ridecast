import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <SignUp
        appearance={{
          variables: { colorPrimary: "#EA580C" },
        }}
      />
    </div>
  );
}
