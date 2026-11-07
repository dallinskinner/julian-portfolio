import { ADVENTURE_ROOMS } from "./content";
import { escapeHtml } from "./utils";

let currentRoom: string | null = null;
let inventory: string[] = [];

export function isAdventureActive(): boolean {
  return currentRoom !== null;
}

function describeRoom(roomId: string): string[] {
  const room = ADVENTURE_ROOMS[roomId];
  return room.description.map((line) => escapeHtml(line));
}

export function startAdventure(): string[] {
  currentRoom = "start";
  inventory = [];
  return [
    '<span class="highlight">A small text adventure begins...</span>',
    "&nbsp;",
    ...describeRoom(currentRoom),
    "&nbsp;",
    '<span class="dim">(try: look, go &lt;place&gt;, take, inventory, quit)</span>',
  ];
}

export function handleAdventureInput(raw: string): string[] {
  if (!currentRoom) return ["you're not on an adventure. type 'adventure' to start one."];
  const room = ADVENTURE_ROOMS[currentRoom];
  const [verbRaw, ...rest] = raw.trim().split(/\s+/);
  const verb = verbRaw?.toLowerCase() ?? "";
  const target = rest.join(" ").toLowerCase();

  if (verb === "quit" || verb === "exit") {
    currentRoom = null;
    return ["you leave the adventure. back to normal now."];
  }

  if (verb === "look") {
    return describeRoom(room.id);
  }

  if (verb === "inventory" || verb === "i") {
    return inventory.length ? [`you're carrying: ${escapeHtml(inventory.join(", "))}`] : ["you're not carrying anything."];
  }

  if (verb === "take") {
    if (!room.item) return ["there's nothing here to take."];
    if (inventory.includes(room.item)) return ["you already have that."];
    inventory.push(room.item);
    return [`you take ${escapeHtml(room.item)}.`];
  }

  // "go <place>" or a bare direction/place name on its own
  const destinationName = verb === "go" ? target : verb;
  const destination = room.exits[destinationName];
  if (destination) {
    currentRoom = destination;
    const lines = describeRoom(destination);
    if (!Object.keys(ADVENTURE_ROOMS[destination].exits).length) {
      currentRoom = null; // reaching a dead-end room (the ending) exits the game
    }
    return lines;
  }

  return ["I don't understand that."];
}
