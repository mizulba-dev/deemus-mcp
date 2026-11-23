import type { ToolHandler } from "../../schemas/tool.js";
import { handlePublishPageGet } from "./handler.js";

export const publishPageGetTool: ToolHandler = {
  definition: {
    name: "publish_page_get",
    description:
      "Get the user's page as others see it now: the copy saved the last time the user updated the page in Deemus, not the current marks. " +
      "Call it when the user asks you to read or review their page. This tool changes nothing. " +
      "Returns shown (false when the page is not up; url, updated_at and page are then null), url, updated_at, " +
      "pending_changes (true when the user's current marks or details differ from the page; the page changes only when the user updates it in Deemus), " +
      "changed_parts (each {part: judgments, profile, principles, skills or projects; names}), and page: " +
      "profile (display_name, experience_years, headline, bio), principles (title, body, area, judgments, hidden_count), " +
      "projects (key, name, kind, summary, role, scale, start_period, end_period, workstreams with name, summary and judgments: " +
      "key, title, involvement, detail, outcome, decided_on, highlighted, skills, revised, revised_by, revises) " +
      "and skills (key, name, kind, years, project_count, judgment_count, project_keys). " +
      "Keys are ids on this page only: revised_by and revises point to judgment keys, project_keys to project keys. " +
      "They are not judgment ids; to change a judgment, find it with judgment_search by its title.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  handler: handlePublishPageGet,
};
