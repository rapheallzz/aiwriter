import UserProvider from "@/components/UserProvider";
import EditorShell from "@/components/EditorShell";

export default function DocumentPage({ params }: { params: { id: string } }) {
  return (
    <UserProvider>
      <EditorShell documentId={params.id} />
    </UserProvider>
  );
}
