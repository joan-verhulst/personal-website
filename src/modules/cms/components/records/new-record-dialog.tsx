"use client";

import { Plus, Search } from "lucide-react";
import Image from "next/image";
import {
  type FormEvent,
  type ReactNode,
  useId,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  addRecord,
  type ItunesSong,
  searchItunes,
} from "~/modules/cms/actions/records";
import Button from "~/modules/cms/components/button";
import FormDialog from "~/modules/cms/components/form-dialog";
import Input from "~/modules/cms/components/input";
import {
  emptyRecord,
  FavoriteSongFields,
  RecordDetailsFields,
  useRecordForm,
} from "~/modules/cms/components/records/record-fields";
import type { RecordValues } from "~/modules/cms/components/records/schema";
import { useAction } from "~/modules/cms/hooks/use-action";
import cn from "~/utils/cn";

// An album is named after the album, a song after the song itself
const titleFor = (song: ItunesSong, type: RecordValues["type"]) =>
  type === "album" ? song.album : song.song;

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The button that opens it, when something else doesn't. */
  trigger?: ReactNode;
}

/**
 * The dialog that adds a record: search Apple Music, pick the favorite song,
 * check the details. The cover is downloaded on the server.
 */
export const NewRecordDialog = ({
  open,
  onOpenChange,
  trigger,
}: DialogProps) => {
  const id = useId();
  const formId = `${id}-form`;
  const { run, isPending } = useAction();
  const [isSearching, startSearch] = useTransition();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ItunesSong[] | null>(null);
  const [picked, setPicked] = useState<ItunesSong | null>(null);
  const form = useRecordForm(emptyRecord);
  const { handleSubmit, reset, setErrors, getValues, setValue } = form;

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) return;
    setTerm("");
    setResults(null);
    setPicked(null);
    reset(emptyRecord);
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!term.trim()) return;
    startSearch(async () => {
      // A search that failed isn't "no songs found", and a throw here would
      // take the whole screen down
      try {
        const result = await searchItunes(term);
        if (result.error) toast.error(result.error);
        else setResults(result.songs ?? []);
      } catch {
        toast.error("Couldn't search Apple Music. Try again.");
      }
    });
  };

  const handlePick = (song: ItunesSong) => {
    const type = getValues("type");
    setPicked(song);
    reset({
      type,
      title: titleFor(song, type),
      artist: song.artist,
      appleId: song.appleId,
      favoriteTitle: song.song,
    });
  };

  // Follows the type with the title, unless it was typed over
  const handleTypeChange = (type: RecordValues["type"]) => {
    if (!picked) return;
    if (getValues("title") === titleFor(picked, getValues("type"))) {
      setValue("title", titleFor(picked, type), { shouldDirty: true });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!picked) return;
    const result = await run(
      () => addRecord(values, picked.artwork),
      "Record added",
    );
    if (result?.fieldErrors) setErrors(result.fieldErrors);
    else if (result && !result.error) handleOpenChange(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title="New record"
      description="Search for your favorite song on it. Its preview plays on the turntable."
      formId={formId}
      submitLabel="Add record"
      isPending={isPending}
      isSubmitDisabled={!picked}
      // Closing would drop the picked song and what's filled in for it
      isDirty={Boolean(picked)}
    >
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input.SearchField
            aria-label="Song and artist"
            placeholder="Song and artist, e.g. Helpless John Mayer"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="h-[35px]"
          isPending={isSearching}
          disabled={!term.trim()}
        >
          {/* The spinner takes over from the icon while it searches */}
          {!isSearching && <Search size={16} aria-hidden />}
          {isSearching ? "Searching…" : "Search"}
        </Button>
      </form>

      {/* Always there, so a screen reader hears each search's outcome */}
      <output
        className={cn(
          "text-neutral-600 text-xs",
          // Only the empty outcome needs showing: the songs show themselves
          results?.length !== 0 && "sr-only",
        )}
      >
        {results &&
          (results.length === 0
            ? "No songs found. Try the song's name with the artist."
            : `${results.length} ${results.length === 1 ? "song" : "songs"} found`)}
      </output>

      {results && results.length > 0 && (
        <div
          role="radiogroup"
          aria-label="Search results"
          // Short enough that the details under it stay in view
          className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded-xl border border-neutral-950/10 p-1"
        >
          {results.map((song) => {
            const isPicked = picked?.appleId === song.appleId;

            return (
              <label
                key={song.appleId}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[10px] p-1.5 pr-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-500 has-[:focus-visible]:-outline-offset-2",
                  isPicked ? "bg-primary-50" : "hover:bg-neutral-950/5",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-result`}
                  value={song.appleId}
                  checked={isPicked}
                  onChange={() => handlePick(song)}
                  className="sr-only"
                />
                {song.artwork ? (
                  <Image
                    src={song.artwork}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="size-10 shrink-0 rounded-lg"
                  />
                ) : (
                  <span className="size-10 shrink-0 rounded-lg bg-neutral-100" />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-neutral-950 text-xs">
                    {song.song}
                  </span>
                  <span className="truncate text-neutral-600 text-xs">
                    {song.album} · {song.artist}
                  </span>
                </span>
                {isPicked && (
                  <span className="shrink-0 font-medium text-primary-500 text-xs">
                    Picked
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {picked ? (
        <form
          id={formId}
          noValidate
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
        >
          <RecordDetailsFields
            form={form}
            idPrefix={id}
            onTypeChange={handleTypeChange}
          />
          <FavoriteSongFields form={form} idPrefix={id} />
        </form>
      ) : (
        <p className="text-neutral-600 text-xs">
          Pick a song to fill in the details.
        </p>
      )}
    </FormDialog>
  );
};

/** The label of every "New record" pill, in the header or elsewhere. */
export const NewRecordLabel = () => (
  <>
    New record
    <Plus size={16} aria-hidden />
  </>
);

/** The header's "New record" pill, with the dialog it opens. */
const NewRecordButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <NewRecordDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="primary">
          <NewRecordLabel />
        </Button>
      }
    />
  );
};

export default NewRecordButton;
