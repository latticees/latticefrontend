import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

import { normalizeStackBetCode } from "./stack/bet-code.ts";

interface BetCodeModalProps {
  open: boolean;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (code: string) => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 13 13" aria-hidden="true">
      <path
        d="M1.5 1.5 11.5 11.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="1.5"
      />
      <path
        d="M11.5 1.5 1.5 11.5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-width="1.5"
      />
    </svg>
  );
}

export default function BetCodeModal(props: BetCodeModalProps) {
  const [value, setValue] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (!props.open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    onCleanup(() => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  createEffect(() => {
    if (!props.open) {
      return;
    }

    setValue(props.initialValue ?? "");
    setError(null);

    queueMicrotask(() => {
      inputRef?.focus();
      inputRef?.select();
    });
  });

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const normalizedCode = normalizeStackBetCode(value());

    if (normalizedCode.length === 0) {
      setError("Enter a valid bet code to load a saved stack.");
      return;
    }

    props.onSubmit(normalizedCode);
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div class="pm-bet-code-modal__overlay" onClick={props.onClose}>
          <section
            class="pm-bet-code-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pm-bet-code-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <div class="pm-bet-code-modal__frame">
              <div class="pm-bet-code-modal__header">
                <div>
                  <p class="pm-bet-code-modal__eyebrow">Shared slip</p>
                  <h2 class="pm-bet-code-modal__title" id="pm-bet-code-modal-title">
                    Load bet code
                  </h2>
                  <p class="pm-bet-code-modal__copy">
                    Paste a shared code to load the saved stack into the builder and place it from
                    there.
                  </p>
                </div>

                <button
                  class="pm-bet-code-modal__icon-button"
                  type="button"
                  aria-label="Close"
                  onClick={props.onClose}
                >
                  <CloseIcon />
                </button>
              </div>

              <form class="pm-bet-code-modal__form" onSubmit={handleSubmit}>
                <label class="pm-bet-code-modal__label" for="pm-bet-code-input">
                  Bet code
                </label>
                <div class="pm-bet-code-modal__input-shell">
                  <input
                    id="pm-bet-code-input"
                    ref={inputRef}
                    class="pm-bet-code-modal__input"
                    type="text"
                    inputmode="text"
                    autocomplete="off"
                    spellcheck={false}
                    placeholder="ABC123"
                    value={value()}
                    onInput={event => {
                      setValue(event.currentTarget.value.toUpperCase());
                      setError(null);
                    }}
                  />
                </div>

                <p class="pm-bet-code-modal__hint">
                  Codes are 6 characters. We will open the saved slip and prefill the stack for
                  you.
                </p>

                <Show when={error()}>
                  {message => <p class="pm-bet-code-modal__error">{message()}</p>}
                </Show>

                <div class="pm-bet-code-modal__actions">
                  <button
                    type="button"
                    class="pm-button pm-button--ghost"
                    onClick={props.onClose}
                  >
                    Cancel
                  </button>
                  <button type="submit" class="pm-button pm-button--primary">
                    Load bet
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </Portal>
    </Show>
  );
}
