import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Check } from "lucide-react";

type Profile = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
};

export function ProfileBar({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const [editing, setEditing] = useState<keyof Profile | null>(null);
  const [draft, setDraft] = useState<Profile>(profile);

  const start = (k: keyof Profile) => {
    setDraft(profile);
    setEditing(k);
  };
  const save = () => {
    onChange(draft);
    setEditing(null);
  };

  const Field = ({ k, label }: { k: keyof Profile; label: string }) => (
    <div className="min-w-0">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {editing === k ? (
        <div className="flex items-center gap-1.5 mt-1">
          <Input
            autoFocus
            value={draft[k]}
            onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="h-8 text-sm"
          />
          <Button size="icon" variant="default" className="h-8 w-8 shrink-0" onClick={save}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => start(k)}
          className="group flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition w-full text-left mt-0.5"
        >
          <span className="truncate">{profile[k]}</span>
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0" />
        </button>
      )}
    </div>
  );

  return (
    <div className="glass rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4 shadow-[var(--shadow-soft)]">
      <Field k="name" label="Name" />
      <Field k="headline" label="Headline" />
      <Field k="email" label="Email" />
      <Field k="phone" label="Phone" />
      <Field k="location" label="Location" />
    </div>
  );
}
