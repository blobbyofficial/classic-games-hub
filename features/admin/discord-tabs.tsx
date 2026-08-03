"use client";

import { Bot, Hammer, RefreshCw, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscordCommandsCard } from "./discord-commands-card";
import { DiscordResetCard } from "./discord-reset-card";
import { DiscordSetupCard } from "./discord-setup-card";
import { AnnounceCard, ChannelCard, ModerationCard, PushCard } from "./discord-console";

/**
 * Four tabs over what had become one very long page.
 *
 * The grouping is by *why you came here*, not by which part of Discord the
 * setting touches: you either want to do something to the server right now
 * (Actions), reconcile it with the settings (Sync), or change how one feature
 * behaves (Levelling, Server). Everything is still one route, so an admin
 * bookmark keeps working and nothing moved to a new URL.
 */
export function DiscordTabs({
  levelling,
  server,
}: {
  levelling: React.ReactNode;
  server: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="actions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="actions">
          <Hammer className="size-4" /> Actions
        </TabsTrigger>
        <TabsTrigger value="sync">
          <RefreshCw className="size-4" /> Sync
        </TabsTrigger>
        <TabsTrigger value="levelling">
          <Star className="size-4" /> Levelling
        </TabsTrigger>
        <TabsTrigger value="server">
          <Bot className="size-4" /> Server
        </TabsTrigger>
      </TabsList>

      <TabsContent value="actions" className="space-y-6">
        <AnnounceCard />
        <ModerationCard />
        <ChannelCard />
      </TabsContent>

      <TabsContent value="sync" className="space-y-6">
        <DiscordSetupCard />
        <DiscordCommandsCard />
        <PushCard />
        <DiscordResetCard />
      </TabsContent>

      <TabsContent value="levelling" className="space-y-6">
        {levelling}
      </TabsContent>

      <TabsContent value="server" className="space-y-6">
        {server}
      </TabsContent>
    </Tabs>
  );
}
