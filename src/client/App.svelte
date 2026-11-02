<script lang="ts">
  import { onMount } from 'svelte';
  import { buildStars, buildSpookLayer, buildXmasLayer } from './lib/effects';
  import { loadSession, clearSession, type HostSession } from './lib/session';
  import { HostController } from './lib/host.svelte';
  import { PlayerController } from './lib/player.svelte';
  import { errorText } from './lib/errors';
  import { setThemeOverride } from './lib/themes';
  import { normaliseCode } from '../shared/code';
  import type { LeaderboardEntry } from '../shared/protocol';
  import ThemePicker from './components/ThemePicker.svelte';
  import Landing from './views/Landing.svelte';
  import QuickCaller from './views/QuickCaller.svelte';
  import HostSetup from './views/HostSetup.svelte';
  import HostLobby from './views/HostLobby.svelte';
  import HostGame from './views/HostGame.svelte';
  import PlayerJoin from './views/PlayerJoin.svelte';
  import PlayerGame from './views/PlayerGame.svelte';
  import EndScreen from './views/EndScreen.svelte';

  type View =
    | { kind: 'landing'; notice?: string }
    | { kind: 'quick' }
    | { kind: 'hostSetup' }
    | { kind: 'host'; ctrl: HostController }
    | { kind: 'join'; code: string }
    | { kind: 'player'; ctrl: PlayerController }
    | { kind: 'end'; leaderboard: LeaderboardEntry[] };

  let view = $state<View>(initialView());

  function initialView(): View {
    const session = loadSession(); // also purges expired records
    const m = location.pathname.match(/^\/join\/([^/]+)\/?$/);
    const linkCode = m ? normaliseCode(decodeURIComponent(m[1])) : null;
    if (session?.role === 'player' && (!linkCode || linkCode === session.code)) {
      return { kind: 'player', ctrl: new PlayerController({ session }) };
    }
    if (linkCode) return { kind: 'join', code: linkCode };
    if (session?.role === 'host') return { kind: 'host', ctrl: new HostController(session) };
    return { kind: 'landing' };
  }

  function go(v: View) {
    view = v;
    const path =
      v.kind === 'host' ? '/host'
      : v.kind === 'join' ? (v.code ? `/join/${v.code}` : '/join')
      : v.kind === 'player' ? `/join/${v.ctrl.code}`
      : '/';
    if (location.pathname !== path) history.replaceState(null, '', path);
    window.scrollTo(0, 0);
  }

  function home(notice?: string) {
    setThemeOverride(null);
    go({ kind: 'landing', notice });
  }

  // React to a game ending or disappearing.
  $effect(() => {
    if (view.kind !== 'host' && view.kind !== 'player') return;
    const end = view.ctrl.end;
    if (!end) return;
    if (end.kind === 'ended') go({ kind: 'end', leaderboard: end.leaderboard });
    else home(errorText(end.code));
  });

  // Normalise the URL for the initial view.
  onMount(() => go(view));

  let starfield = $state<HTMLElement>()!;
  let spookLayer = $state<HTMLElement>()!;
  let xmasLayer = $state<HTMLElement>()!;

  onMount(() => {
    buildStars(starfield);
    buildSpookLayer(spookLayer);
    buildXmasLayer(xmasLayer);
  });
</script>

<div class="starfield" bind:this={starfield}></div>
<div class="spook-layer" bind:this={spookLayer} aria-hidden="true"></div>
<div class="xmas-layer" bind:this={xmasLayer} aria-hidden="true"></div>

<main>
  {#if view.kind === 'landing'}
    <Landing
      notice={view.notice}
      onHost={() => go({ kind: 'hostSetup' })}
      onJoin={() => go({ kind: 'join', code: '' })}
      onQuick={() => go({ kind: 'quick' })}
    />
  {:else if view.kind === 'quick'}
    <QuickCaller onExit={() => home()} />
  {:else if view.kind === 'hostSetup'}
    <HostSetup onBack={() => home()} onCreated={(s: HostSession) => go({ kind: 'host', ctrl: new HostController(s) })} />
  {:else if view.kind === 'host'}
    {#if view.ctrl.started}
      <HostGame host={view.ctrl} />
    {:else}
      <HostLobby host={view.ctrl} />
    {/if}
  {:else if view.kind === 'join'}
    <PlayerJoin initialCode={view.code} onBack={() => home()} onJoined={ctrl => go({ kind: 'player', ctrl })} />
  {:else if view.kind === 'player'}
    <PlayerGame player={view.ctrl} onLeave={() => home()} />
  {:else if view.kind === 'end'}
    <EndScreen leaderboard={view.leaderboard} onHome={() => { clearSession(); home(); }} />
  {/if}
</main>

<!-- Players get the host's theme and no sound effects, so the picker would only cover their ticket. -->
{#if view.kind !== 'player'}
  <ThemePicker />
{/if}
