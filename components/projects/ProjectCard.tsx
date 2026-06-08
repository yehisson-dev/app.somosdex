"use client";

import Link from "next/link";
import { Users, ListTodo, ArrowRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { Project, User } from "@/types/database";

interface ProjectWithMeta {
  id: string;
  name: string;
  slug: string;
  color: string;
  manager?: User;
  members?: Array<{ user: User }>;
  task_count?: Array<{ count: number }>;
}

export function ProjectCard({ project }: { project: ProjectWithMeta }) {
  const memberCount = project.members?.length ?? 0;
  const taskCount = (project.task_count as unknown as Array<{ count: number }>)?.[0]?.count ?? 0;
  const members = project.members?.slice(0, 4) ?? [];

  return (
    <Link
      href={`/proyectos/${project.id}`}
      className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
            style={{ backgroundColor: project.color + "20", border: `1px solid ${project.color}40` }}
          >
            <span style={{ color: project.color }}>
              {project.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{project.name}</h3>
            {project.manager && (
              <p className="text-xs text-gray-400 mt-0.5">
                {project.manager.full_name}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <ListTodo className="w-3.5 h-3.5" />
          <span>{taskCount} tareas</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Users className="w-3.5 h-3.5" />
          <span>{memberCount} miembros</span>
        </div>
      </div>

      {/* Color bar */}
      <div className="h-1 rounded-full bg-gray-100 mb-4">
        <div
          className="h-1 rounded-full transition-all"
          style={{ backgroundColor: project.color, width: "35%" }}
        />
      </div>

      {/* Members avatars */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {members.map(({ user }) => (
            <Avatar key={user.id} className="w-6 h-6 border-2 border-white">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback
                className="text-[9px] font-medium text-white"
                style={{ backgroundColor: project.color + "60" }}
              >
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: project.color + "20", color: project.color }}
        >
          {project.name}
        </span>
      </div>
    </Link>
  );
}
