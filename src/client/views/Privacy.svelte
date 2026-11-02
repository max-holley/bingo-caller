<script lang="ts">
  // Privacy notice (spec section 9.3). Plain English, readable by a young person.
  // Keep in step with what the code actually does: if you add any data, storage or third party,
  // update this page (and LAST_UPDATED) in the same change.
  import Header from '../components/Header.svelte';

  let { onBack }: { onBack: () => void } = $props();
  const CONTACT = 'max@webh.dev';
  const LAST_UPDATED = '2 November 2026';
</script>

<div class="app">
  <Header subtitle="Privacy notice" />
  <article class="panel privacy fade-in">
    <p class="privacy-lead">
      This app lets a host run a bingo game and other people join it with a code. We collect as little as
      possible, we don't use cookies, adverts or tracking, and everything about a game is deleted when it ends.
    </p>

    <h2>Who we are</h2>
    <p>
      Bingo Caller is run by Max at webh.dev, who is responsible for your information (the "controller").
      Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
    </p>

    <h2>What we collect</h2>
    <!-- Focusable so keyboard users can scroll the table sideways on small screens (WCAG 2.1.1). -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-wrap" tabindex="0" role="region" aria-label="What we collect (scrolls sideways on small screens)">
      <table>
        <thead><tr><th>What</th><th>Where it's kept</th><th>Why</th><th>How long</th></tr></thead>
        <tbody>
          <tr><td>Your nickname</td><td>Our game server</td><td>So the host knows who is playing</td><td>Until the game ends (24 hours at most)</td></tr>
          <tr><td>A random player ID and a scrambled copy of your secret key</td><td>Our game server</td><td>So you can rejoin if you refresh or lose signal</td><td>Same</td></tr>
          <tr><td>Your points</td><td>Our game server</td><td>Scoring</td><td>Same</td></tr>
          <tr><td>Your ticket and the numbers you mark</td><td>Only your device</td><td>Playing. They are sent to the host only when you press BINGO, then thrown away</td><td>Until the game ends (24 hours at most)</td></tr>
          <tr><td>Your IP address</td><td>Handled by Cloudflare, which runs our servers</td><td>Delivering the app, and stopping abuse</td><td>See below</td></tr>
        </tbody>
      </table>
    </div>
    <p>
      We don't ask for your real name, email address or age, and there are no accounts. The app never reads
      your location, camera or microphone. To stop one connection creating or joining lots of games, the app
      uses a scrambled (hashed) version of your IP address for a moment to count attempts. It is not saved
      or logged by the app.
    </p>

    <h2>Why we're allowed to use it</h2>
    <p>
      We use this information because we have a <strong>legitimate interest</strong> in running the game you
      asked to join and in keeping the service safe from abuse. We only use what that needs, and it doesn't
      affect you beyond the game itself. You can object at any time by leaving the game.
    </p>

    <h2>Who can see it</h2>
    <ul>
      <li>The <strong>host</strong> sees the nicknames and points of everyone in their game, and your ticket when you press BINGO.</li>
      <li>At the end, <strong>everyone in the game</strong> sees the final scoreboard: nicknames and points.</li>
      <li>Other players don't see your ticket or marks.</li>
      <li><strong>Cloudflare</strong> hosts the app and the game server for us, as our "processor". It only handles data
        on our instructions, under its <a href="https://www.cloudflare.com/cloudflare-customer-dpa/" target="_blank" rel="noopener noreferrer">Data Processing Addendum</a>.
        Cloudflare's network is worldwide, so data may be handled outside the UK; the addendum includes the legal
        safeguards UK law requires for that. Cloudflare's own handling of network data such as IP addresses is
        described in its <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">privacy policy</a>.</li>
    </ul>
    <p>We don't sell or share your information with anyone else.</p>

    <h2>How long we keep it</h2>
    <p>
      Everything about a game is deleted from our server as soon as the host presses <em>End game</em>.
      If the host leaves and doesn't come back within an hour, the game is deleted then. Every game is deleted
      after 24 hours, whatever happens. We keep no history of games, winners or players.
    </p>

    <h2>What's saved on your device</h2>
    <p>The app uses your browser's local storage (not cookies), and only after you do something:</p>
    <ul>
      <li><strong>Your current game</strong> (<code>bingo.session</code>): game code, player ID, secret key, nickname, ticket,
        marks and when it expires. This lets you rejoin after a refresh. It's removed when the game ends, or after 24 hours.</li>
      <li><strong>Your preferences</strong> (<code>bingo.theme</code>, <code>bingo.muted</code>, <code>bingo.optout.*</code>):
        your colour theme, whether sounds are on, and whether you switched off a seasonal theme.</li>
    </ul>
    <p>
      These are needed for the features you use, so we don't ask for consent. To delete them all, press
      <strong>Clear data on this device</strong> at the bottom of any screen. That also leaves any game you're in.
    </p>

    <h2>Your rights</h2>
    <p>
      You can ask to see, correct or delete your information, or object to us using it. Because everything is
      deleted within 24 hours and isn't linked to your name or an account, the quickest way is usually to leave
      the game or ask the host to remove you. For anything else, email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      and tell us the game code and your nickname.
    </p>
    <p>
      If you're unhappy with how we've handled your information, you can complain to the Information
      Commissioner's Office (ICO): <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">ico.org.uk/make-a-complaint</a>.
    </p>

    <h2>Children</h2>
    <p>
      Families play bingo, so this app is built to be safe for children: use a nickname, not your real name.
      There's no chat, no profile, no adverts, nothing to buy and no tracking. The host (a grown-up) can remove
      players and lock the game. If you're not sure about something, ask a grown-up.
    </p>

    <p class="hint">Last updated: {LAST_UPDATED}</p>
    <button type="button" class="btn btn-secondary" onclick={onBack}>← Back</button>
  </article>
</div>
