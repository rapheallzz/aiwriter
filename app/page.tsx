import UserProvider from "@/components/UserProvider";
import Dashboard from "@/components/Dashboard";

export default function HomePage() {
  return (
    <UserProvider>
      <Dashboard />
    </UserProvider>
  );
}
