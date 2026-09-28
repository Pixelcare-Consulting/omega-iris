import * as DashboardViewerModule from 'stimulsoft-dashboards-js-react/viewer'
import * as DashboardDesignerModule from 'stimulsoft-dashboards-js-react/designer'
import * as PaginatedViewerModule from 'stimulsoft-reports-js-react/viewer'
import * as PaginatedDesignerModule from 'stimulsoft-reports-js-react/designer'

export { DashboardViewerModule, DashboardDesignerModule, PaginatedViewerModule, PaginatedDesignerModule }

export const DashboardViewer = DashboardViewerModule.Viewer
export const DashboardDesigner = DashboardDesignerModule.Designer
export const PaginatedViewer = PaginatedViewerModule.Viewer
export const PaginatedDesigner = PaginatedDesignerModule.Designer

//* the report variable every fn_get_* is scoped by, injected from the session so no caller has to pass it
export const REPORT_DB_CODE_PARAM = 'DbCode'

//* fills report variables from a params map — a name the report never declared is skipped
export function applyReportParams(report: any, params?: Record<string, any>) {
  if (!params) return

  Object.entries(params).forEach(([key, value]) => {
    const variable = report?.dictionary?.variables?.getByName(key)

    //! nothing to set — add the variable in the designer or the report runs unscoped
    if (!variable) {
      console.warn(`Report has no "${key}" variable, so nothing was injected for it.`)
      return
    }

    variable.value = value
  })
}
