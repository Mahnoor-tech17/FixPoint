import { Check, Circle } from "lucide-react";
import { passwordRules } from "../../lib/passwordPolicy";

export default function PasswordChecklist({ password = "" }) {
  return (
    <ul className="mt-2 space-y-1">
      {passwordRules.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs ${
              ok ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            {ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}