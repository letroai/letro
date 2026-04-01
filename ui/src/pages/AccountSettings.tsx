import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { User } from "lucide-react";

export default function AccountSettings() {
  return (
    <div>
      <ProjectHeader title="내 계정" />
      <EmptyState
        icon={User}
        message="계정 설정 기능은 곧 추가될 예정이에요."
      />
    </div>
  );
}
