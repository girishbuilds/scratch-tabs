import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import { Page, BrowserContext } from '@playwright/test';
import { EditorActions } from './editor.actions';
import { TabBarActions } from './tabBar.actions';
import { ContextMenuActions } from './contextMenu.actions';
import { NavigationActions } from './navigation.actions';
import { ClipboardActions } from './clipboard.actions';
import { FileActions } from './file.actions';
import { StatusBarActions } from './statusBar.actions';
import { CsvTableViewActions } from './csvTableView.actions';
import { JsonSmartViewActions } from './jsonSmartView.actions';
import { SvgSmartViewActions } from './svgSmartView.actions';
import { DownloadActions } from './download.actions';
import { ConfirmationDialogActions } from './confirmationDialog.actions';
import { SmartViewCalloutActions } from './smartViewCallout.actions';
import { ShareActions } from './share.actions';
import { PipelineActions } from './pipeline.actions';
import { SidebarActions } from './sidebar.actions';
import { TabletsActions } from './tablets.actions';
import { QuickTransformActions } from './quickTransform.actions';
import { XmlSmartViewActions } from './xmlSmartView.actions';
import { CanvasActions } from './canvas.actions';
import { CanvasConflictActions } from './canvasConflict.actions';
import { MergeTabsActions } from './mergeTabs.actions';

/**
 * E2E World Class - Lightweight Orchestrator & Dependency Injection Container
 * 
 * This class serves as the central hub for E2E tests, providing:
 * - Cucumber World lifecycle management
 * - Playwright page/context state management
 * - Action class orchestration and dependency injection
 * - Consistent state sharing across step definitions
 */
export class E2EWorld extends World {
  context!: BrowserContext;
  page!: Page;

  // Action class instances - each encapsulates specific UI interactions
  editor!: EditorActions;
  tabBar!: TabBarActions;
  contextMenu!: ContextMenuActions;
  navigation!: NavigationActions;
  clipboard!: ClipboardActions;
  file!: FileActions;
  statusBar!: StatusBarActions;
  csvTableView!: CsvTableViewActions;
  jsonSmartView!: JsonSmartViewActions;
  svgSmartView!: SvgSmartViewActions;
  download!: DownloadActions;
  confirmationDialog!: ConfirmationDialogActions;
  smartViewCallout!: SmartViewCalloutActions;
  share!: ShareActions;
  pipeline!: PipelineActions;
  sidebar!: SidebarActions;
  tablets!: TabletsActions;
  quickTransform!: QuickTransformActions;
  xmlSmartView!: XmlSmartViewActions;
  canvas!: CanvasActions;
  canvasConflict!: CanvasConflictActions;
  mergeTabs!: MergeTabsActions;

  constructor(options: IWorldOptions) {
    super(options);
    // The 'page' object isn't available yet, so we initialize helpers in a 'Before' hook
    // where the page is guaranteed to exist.
  }

  /**
   * Initialize all action class instances with the current page.
   * Called from the Before hook in hooks.ts where page is guaranteed to exist.
   */
  initializeHelpers() {
    this.editor = new EditorActions(this.page);
    this.tabBar = new TabBarActions(this.page);
    this.contextMenu = new ContextMenuActions(this.page);
    this.navigation = new NavigationActions(this.page);
    this.clipboard = new ClipboardActions(this.page);
    this.file = new FileActions(this.page);
    this.statusBar = new StatusBarActions(this.page);
    this.csvTableView = new CsvTableViewActions(this.page);
    this.jsonSmartView = new JsonSmartViewActions(this.page);
    this.svgSmartView = new SvgSmartViewActions(this.page);
    this.download = new DownloadActions(this.page);
    this.confirmationDialog = new ConfirmationDialogActions(this.page);
    this.smartViewCallout = new SmartViewCalloutActions(this.page);
    this.share = new ShareActions(this.page, this.context);
    this.pipeline = new PipelineActions(this.page);
    this.sidebar = new SidebarActions(this.page);
    this.tablets = new TabletsActions(this.page);
    this.quickTransform = new QuickTransformActions(this.page);
    this.xmlSmartView = new XmlSmartViewActions(this.page);
    this.canvas = new CanvasActions(this.page);
    this.canvasConflict = new CanvasConflictActions(
      this.page,
      this.context,
      this.canvas,
    );
    this.mergeTabs = new MergeTabsActions(this.page);
  }
}

setWorldConstructor(E2EWorld);
