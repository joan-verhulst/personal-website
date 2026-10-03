import { Disc3, House } from "lucide-react";
import type { Metadata } from "next";
import Header from "~/modules/cms/components/header";
import { RECORDS } from "~/modules/cms/components/records/config";
import NewRecordButton from "~/modules/cms/components/records/new-record-dialog";
import RecordsGrid from "~/modules/cms/components/records/records-grid";
import ReorderRecordsButton from "~/modules/cms/components/records/reorder-records-button";
import { readRows } from "~/modules/cms/utils/read-rows";
import type { RecordRow } from "~/modules/content/utils/rows";

export const metadata: Metadata = { title: RECORDS.title };

const OnRotationAdmin = async () => {
  const records = await readRows<RecordRow>("records");
  const first = records[0];

  return (
    <>
      <Header
        title={RECORDS.title}
        description={RECORDS.description}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Disc3 aria-hidden />
              {records.length} {records.length === 1 ? "record" : "records"}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <House aria-hidden />
              <span className="truncate">
                {first
                  ? `Home widget: ${first.title}`
                  : "Nothing on the home widget yet"}
              </span>
            </span>
          </>
        }
        actions={
          <>
            <ReorderRecordsButton rows={records} />
            <NewRecordButton />
          </>
        }
      />
      <RecordsGrid rows={records} />
    </>
  );
};

export default OnRotationAdmin;
