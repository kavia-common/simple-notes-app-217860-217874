import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_KEY = "retro_notes_v1";

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * Generates a reasonably unique ID without adding dependencies.
 * Uses crypto.randomUUID when available, falls back to a time+random string.
 */
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Safely parse notes from localStorage, returning [] on any error.
 * @returns {Note[]}
 */
function loadNotesFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Minimal shape normalization
    return parsed
      .filter((n) => n && typeof n === "object")
      .map((n) => ({
        id: typeof n.id === "string" ? n.id : generateId(),
        title: typeof n.title === "string" ? n.title : "",
        content: typeof n.content === "string" ? n.content : "",
        createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

/**
 * @param {Note[]} notes
 */
function saveNotesToStorage(notes) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // If storage is unavailable/quota exceeded, we silently ignore.
  }
}

// PUBLIC_INTERFACE
function App() {
  const [notes, setNotes] = useState(() => loadNotesFromStorage());

  const [query, setQuery] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(/** @type {"add"|"edit"} */ ("add"));
  const [activeNoteId, setActiveNoteId] = useState(/** @type {string|null} */ (null));

  // Controlled form inputs
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  // Persist on any notes change
  useEffect(() => {
    saveNotesToStorage(notes);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;

    return notes.filter((n) => {
      const haystack = `${n.title}\n${n.content}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, query]);

  const activeNote = useMemo(() => {
    if (!activeNoteId) return null;
    return notes.find((n) => n.id === activeNoteId) ?? null;
  }, [activeNoteId, notes]);

  // PUBLIC_INTERFACE
  function openAddModal() {
    setModalMode("add");
    setActiveNoteId(null);
    setDraftTitle("");
    setDraftContent("");
    setModalOpen(true);
  }

  // PUBLIC_INTERFACE
  function openEditModal(noteId) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    setModalMode("edit");
    setActiveNoteId(noteId);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setModalOpen(true);
  }

  // PUBLIC_INTERFACE
  function closeModal() {
    setModalOpen(false);
    setActiveNoteId(null);
    setDraftTitle("");
    setDraftContent("");
  }

  // PUBLIC_INTERFACE
  function handleSave(e) {
    e.preventDefault();

    const title = draftTitle.trim();
    const content = draftContent.trim();

    if (!title && !content) return;

    if (modalMode === "add") {
      const now = Date.now();
      const newNote = {
        id: generateId(),
        title: title || "Untitled",
        content,
        createdAt: now,
        updatedAt: now,
      };

      // newest first
      setNotes((prev) => [newNote, ...prev]);
      closeModal();
      return;
    }

    // edit mode
    if (!activeNoteId) return;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== activeNoteId) return n;
        return {
          ...n,
          title: title || "Untitled",
          content,
          updatedAt: Date.now(),
        };
      })
    );
    closeModal();
  }

  // PUBLIC_INTERFACE
  function handleDelete(noteId) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const ok = window.confirm(`Delete note "${note.title || "Untitled"}"?`);
    if (!ok) return;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (activeNoteId === noteId) setActiveNoteId(null);
  }

  // PUBLIC_INTERFACE
  function handleClearAll() {
    if (notes.length === 0) return;
    const ok = window.confirm("Delete ALL notes? This cannot be undone.");
    if (!ok) return;
    setNotes([]);
    setActiveNoteId(null);
  }

  const totalCount = notes.length;
  const showingCount = filteredNotes.length;

  return (
    <div className="App" data-retro="true">
      <header className="TopBar">
        <div className="Brand">
          <div className="BrandMark" aria-hidden="true">
            N
          </div>
          <div className="BrandText">
            <h1 className="AppTitle">Retro Notes</h1>
            <p className="AppSubtitle">Add, edit, delete — saved on this device.</p>
          </div>
        </div>

        <div className="TopBarActions">
          <button className="Btn BtnPrimary" onClick={openAddModal} type="button">
            + New Note
          </button>
          <button
            className="Btn BtnDanger"
            onClick={handleClearAll}
            type="button"
            disabled={notes.length === 0}
          >
            Clear All
          </button>
        </div>
      </header>

      <main className="Main">
        <section className="Panel">
          <div className="PanelHeader">
            <h2 className="PanelTitle">Your Notes</h2>
            <div className="PanelMeta" aria-live="polite">
              <span className="Pill">{totalCount} total</span>
              <span className="Pill">{showingCount} showing</span>
            </div>
          </div>

          <div className="Toolbar">
            <label className="Search">
              <span className="SearchLabel">Search</span>
              <input
                className="Input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter notes…"
                aria-label="Search notes"
              />
            </label>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="EmptyState">
              <div className="EmptyIcon" aria-hidden="true">
                ▣
              </div>
              <div>
                <p className="EmptyTitle">
                  {notes.length === 0 ? "No notes yet." : "No matches."}
                </p>
                <p className="EmptyText">
                  {notes.length === 0
                    ? "Create your first note to get started."
                    : "Try a different search query."}
                </p>
              </div>
              {notes.length === 0 ? (
                <button className="Btn BtnPrimary" onClick={openAddModal} type="button">
                  Create a note
                </button>
              ) : (
                <button className="Btn" onClick={() => setQuery("")} type="button">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <ul className="NotesGrid" aria-label="Notes list">
              {filteredNotes.map((note) => (
                <li key={note.id} className="NoteCard">
                  <div className="NoteCardHeader">
                    <h3 className="NoteTitle" title={note.title}>
                      {note.title || "Untitled"}
                    </h3>
                    <div className="NoteActions">
                      <button
                        className="IconBtn"
                        onClick={() => openEditModal(note.id)}
                        type="button"
                        aria-label={`Edit note ${note.title || "Untitled"}`}
                      >
                        Edit
                      </button>
                      <button
                        className="IconBtn IconBtnDanger"
                        onClick={() => handleDelete(note.id)}
                        type="button"
                        aria-label={`Delete note ${note.title || "Untitled"}`}
                      >
                        Del
                      </button>
                    </div>
                  </div>

                  <p className="NoteContent">
                    {note.content ? note.content : <span className="Muted">(empty)</span>}
                  </p>

                  <div className="NoteFooter">
                    <span className="Timestamp">
                      Updated {new Date(note.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {modalOpen ? (
        <div
          className="ModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-modal-title"
          onMouseDown={(e) => {
            // close when clicking the shaded backdrop only
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="Modal">
            <div className="ModalHeader">
              <h2 className="ModalTitle" id="note-modal-title">
                {modalMode === "add" ? "New Note" : "Edit Note"}
              </h2>
              <button className="IconBtn" onClick={closeModal} type="button" aria-label="Close modal">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="ModalBody">
              <label className="Field">
                <span className="FieldLabel">Title</span>
                <input
                  className="Input"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="E.g. Grocery list"
                  autoFocus
                />
              </label>

              <label className="Field">
                <span className="FieldLabel">Content</span>
                <textarea
                  className="Textarea"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Write something…"
                  rows={8}
                />
              </label>

              {modalMode === "edit" && activeNote ? (
                <div className="ModalHint" aria-live="polite">
                  Editing: <strong>{activeNote.title || "Untitled"}</strong>
                </div>
              ) : null}

              <div className="ModalActions">
                <button className="Btn" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="Btn BtnPrimary"
                  type="submit"
                  disabled={draftTitle.trim() === "" && draftContent.trim() === ""}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <footer className="Footer">
        <p className="FooterText">
          Stored locally in your browser via <code>localStorage</code>.
        </p>
      </footer>
    </div>
  );
}

export default App;
