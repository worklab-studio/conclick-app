import { parseRequest } from '@/lib/request';
import { json, notFound, ok, unauthorized } from '@/lib/response';
import { reportSchema } from '@/lib/schema';
import { canDeleteReport, canUpdateReport, canViewReport } from '@/permissions';
import { deleteReport, getReport, updateReport } from '@/queries/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { reportId } = await params;

  const report = await getReport(reportId);

  if (!report) {
    return notFound();
  }

  if (!(await canViewReport(auth, report))) {
    return unauthorized();
  }

  return json(report);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, reportSchema);

  if (error) {
    return error();
  }

  const { reportId } = await params;
  const { type, name, description, parameters } = body;

  const report = await getReport(reportId);

  if (!report) {
    return notFound();
  }

  // Authorize against the report itself, not the body-supplied websiteId.
  // Otherwise a user with write access to ANY website could hijack any
  // other user's report by POSTing the victim's reportId with their own websiteId.
  if (!(await canUpdateReport(auth, report))) {
    return unauthorized();
  }

  const result = await updateReport(reportId, {
    type,
    name,
    description,
    parameters,
  } as any);

  return json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { reportId } = await params;
  const report = await getReport(reportId);

  if (!report) {
    return notFound();
  }

  // Use report-level ownership check, not website-level — a team manager
  // who can delete a website should not be able to nuke saved reports
  // authored by other members on that website.
  if (!(await canDeleteReport(auth, report))) {
    return unauthorized();
  }

  await deleteReport(reportId);

  return ok();
}
