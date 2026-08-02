export interface Dictionary {
  nav: {
    myZones: string;
    inventory: string;
    receivings: string;
    disposals: string;
    products: string;
    organization: string;
    users: string;
    positions: string;
    zones: string;
    suppliers: string;
    categories: string;
  };
  disposals: {
    pageTitle: string;
    addDisposal: string;
    empty: string;
    newTitle: string;
    zoneLabel: string;
    zoneSingle: string;         // e.g. "Zone: {name}"
    zoneNoAccess: string;
    productLabel: string;
    productPlaceholder: string;
    productNoOptions: string;
    productEmptyZone: string;
    quantityLabel: string;
    saveButton: string;
    createdNotify: string;
    addItem: string;
    itemsSection: string;
    itemsEmpty: string;
    columnSkuCount: string; // "{n} SKU"
    columnAuthor: string;
    groupToday: string;
    groupYesterday: string;
    filterDateFrom: string;
    filterDateTo: string;
    filterZoneAll: string;
    filterRole: string;
    filterRoleAll: string;
    deleteButton: string;
    deleteConfirmTitle: string;
    deleteConfirmBody: string;
    deletedNotify: string;
  };
  header: { search: string; notifications: string; language: string };
  userMenu: { myProfile: string; signOut: string };

  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    add: string;
    close: string;
    retry: string;
    loading: string;
    back: string;
    backToList: string;
    actions: string;
    ok: string;
    yes: string;
    no: string;
    all: string;
    none: string;
    active: string;
    inactive: string;
    activate: string;
    deactivate: string;
    remove: string;
    saving: string;
    search: string;
    nothingFound: string;
    notSelected: string;
    filter: string;
    error: string;
  };

  roles: { admin: string; manager: string; employee: string };

  inventory: {
    pageTitle: string;
    startInventory: string;
    open: string;
    lastCompletedAt: string;   // "Last completed: {date}"
    neverCompleted: string;
    historyTitle: string;      // "Inventory history"
    empty: string;             // "No completed inventories yet"
    sessionTitle: string;      // "Inventory {number}"
    metaNumber: string;
    metaZone: string;
    metaCompletedAt: string;
    metaCreatedBy: string;
    metaItemsCount: string;
    statusCompleted: string;
    statusDraft: string;
    statusCancelled: string;
    columnNumber: string;
    columnDate: string;
    columnName: string;
    columnRole: string;
    columnCategory: string;
    columnProduct: string;
    columnQuantity: string;
    columnUnit: string;
    noneCategory: string;
    totalsLine: string; // "Total items: {items} · Total (base units): {sum}"
    editedChip: string;
    editedTooltipBy: string;   // "Edited: {name} ({role}), {date}"
    editedTooltipAt: string;   // "Edited: {date}"
    editDialogTitle: string;
    editDialogWas: string;     // "{name} · was {qty} {unit}"
    editDialogNewLabel: string; // "New quantity, {unit}"
    editDialogHint: string;
    editDialogErrorRange: string;
    editDialogErrorFormat: string;
    editDialogTooltip: string;
    saved: string;             // "Item updated"

    draftTitle: string;        // "Inventory · {zone}"
    draftSaveDraft: string;
    draftComplete: string;
    draftSavedDraft: string;
    draftCompleted: string;
    draftLoading: string;
    draftNoItems: string;

    zonesPickHint: string;
    zonesEmpty: string;
    zoneCardLastLabel: string;
    lastNever: string;
    lastToday: string;      // "today at {time}"
    lastYesterday: string;  // "yesterday at {time}"
    lastAtDate: string;     // "{date} at {time}"

    dateToday: string;      // "today, {time}"
    dateYesterday: string;  // "yesterday, {time}"
    dateAt: string;         // "{date}, {time}"
    historyBackToZones: string;
    historyPageTitle: string; // "Inventory — {zone}"
    lockedToday: string;

    draftSaved: string;
    completedTodayAt: string; // "Zone inventory completed today at {time}"
    noItemsForZone: string;
    confirmCompleteTitle: string;
    confirmCompleteBody: string; // "Complete inventory for zone «{zone}»?"
    confirmCompleteBtn: string;
    completedForZoneNotify: string; // "Inventory for zone «{zone}» completed"
    noPositions: string;
    errorFillAll: string;
    errorCheckValues: string;
  };

  products: {
    pageTitle: string;
    addProduct: string;
    editProduct: string;
    newProduct: string;
    empty: string;
    searchPlaceholder: string;
    filterCategoryAll: string;
    filterCategoryNone: string;
    filterZoneAll: string;
    filterUnitAny: string;
    filterUnitLabel: string;
    filterZoneLabel: string;
    filterCategoryLabel: string;
    filterActiveLabel: string;
    filterActiveAll: string;
    filterActiveActive: string;
    filterActiveInactive: string;
    filterInventoryLabel: string;
    filterInventoryYes: string;
    filterInventoryNo: string;
    filterPurchaseLabel: string;
    filterPurchaseYes: string;
    filterPurchaseNo: string;

    columnName: string;
    columnZones: string;
    columnStock: string;
    columnUnit: string;
    columnPrice: string;
    columnTarget: string;
    columnActions: string;

    targetTooltip: string;
    noCategory: string;
    inactiveCategoryTag: string;
    confirmDeactivateTitle: string;
    confirmDeactivateBody: string;
    confirmActivateTitle: string;
    confirmActivateBody: string;
    savedNotify: string;
    activatedNotify: string;
    deactivatedNotify: string;

    priceTooltipLastReceived: string; // "Last receiving: {date}"
    priceTooltipPerUnit: string;      // "{price} {sym} per {unit}"
    stockTotalLabel: string;          // "Total"

    // Dialog
    sectionMain: string;
    sectionIdentifiers: string;
    sectionZones: string;
    sectionUsage: string;
    sectionTargetStock: string;
    targetStockHint: string;

    fieldName: string;
    fieldDescription: string;
    fieldCategory: string;
    fieldCategoryNone: string;
    fieldBaseUnit: string;
    fieldSku: string;
    fieldBarcode: string;
    fieldZones: string;
    fieldZonesPlaceholder: string;
    fieldMinQuantity: string;
    fieldOptimalQuantity: string;
    switchInventoryTracked: string;
    switchPurchasable: string;
  };

  receivings: {
    pageTitle: string;
    addReceiving: string;
    empty: string;
    columnNumber: string;
    columnDate: string;
    columnSupplier: string;
    columnPositions: string;
    columnZones: string;
    columnTotal: string;
    columnAuthor: string;

    newTitle: string;
    editTitle: string;
    draftUnsaved: string;
    supplier: string;
    supplierNone: string;
    receivedAt: string;
    dateHintOwner: string;
    dateHintManager: string;
    dateTooOld: string;

    itemsSection: string;
    addItem: string;
    itemsEmpty: string;
    colProductDistribution: string;
    colTakenTotal: string;

    quantity: string;
    cost: string;
    zonesLabel: string;
    zonesEmpty: string;

    progressPrefix: string;   // "Distributed"
    progressOf: string;       // "/"
    progressRemaining: string; // "remaining {n}"
    progressOver: string;      // "over by {n}"

    deliveryCost: string;
    totalItems: string;
    totalDelivery: string;
    totalGrand: string;

    saveButton: string;
    saveEditButton: string;
    savingButton: string;

    createdNotify: string;
    updatedNotify: string;
    deletedNotify: string;

    editButton: string;
    deleteButton: string;
    confirmDeleteTitle: string;
    confirmDeleteBody: string;
    detailTitle: string; // "Receiving {number}"
    metaNumber: string;
    metaDate: string;
    metaSupplier: string;
    metaCreatedAt: string;
    metaAuthor: string;
    metaPositions: string;

    // Product picker
    pickerTitle: string;
    pickerAvailable: string;
    pickerChosen: string;
    pickerNothing: string;
    pickerEmpty: string;
    pickerMoveAll: string;
    pickerMoveSelected: string;
    pickerRemoveSelected: string;
    pickerRemoveAll: string;
    pickerCategoryAll: string;
    pickerCategoryNone: string;
    pickerZoneAll: string;

    // Status summary
    positionsWord: string;   // pluralized: {count} positions
    completeSuffix: string;  // "{count} fully distributed"
    attentionSuffix: string; // "{count} need attention"

    withoutCategory: string;
  };

  units: {
    PIECE: string;
    GRAM: string;
    KILOGRAM: string;
    MILLILITER: string;
    LITER: string;
    PACK: string;
    BOX: string;
    BOTTLE: string;
    CAN: string;
    BAG: string;
  };
}

export const en: Dictionary = {
  nav: {
    myZones: 'My zones',
    inventory: 'Inventory',
    receivings: 'Receivings',
    disposals: 'Disposals',
    products: 'Products',
    organization: 'Organization',
    users: 'Users',
    positions: 'Positions',
    zones: 'Zones',
    suppliers: 'Suppliers',
    categories: 'Categories',
  },
  header: { search: 'Search', notifications: 'Notifications', language: 'Language' },
  userMenu: { myProfile: 'My profile', signOut: 'Sign out' },

  common: {
    save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', add: 'Add',
    close: 'Close', retry: 'Retry', loading: 'Loading…', back: 'Back', backToList: '← Back to list',
    actions: 'Actions', ok: 'OK', yes: 'Yes', no: 'No', all: 'All', none: 'None',
    active: 'Active', inactive: 'Inactive', activate: 'Activate', deactivate: 'Deactivate',
    remove: 'Remove', saving: 'Saving…', search: 'Search', nothingFound: 'Nothing found',
    notSelected: 'Not selected', filter: 'Filter', error: 'Error',
  },

  roles: { admin: 'Administrator', manager: 'Manager', employee: 'Employee' },

  inventory: {
    pageTitle: 'Inventory',
    startInventory: 'Start inventory',
    open: 'Open',
    lastCompletedAt: 'Last completed: {date}',
    neverCompleted: 'Not counted yet',
    historyTitle: 'Inventory history',
    empty: 'No completed inventories yet',
    sessionTitle: 'Inventory {number}',
    metaNumber: 'Number',
    metaZone: 'Zone',
    metaCompletedAt: 'Completed',
    metaCreatedBy: 'Author',
    metaItemsCount: 'Items',
    statusCompleted: 'Completed',
    statusDraft: 'Draft',
    statusCancelled: 'Cancelled',
    columnNumber: '#',
    columnDate: 'Date',
    columnName: 'Name',
    columnRole: 'Role',
    columnCategory: 'Category',
    columnProduct: 'Product',
    columnQuantity: 'Quantity',
    columnUnit: 'Unit',
    noneCategory: '—',
    totalsLine: 'Total items: {items} · Total (base units): {sum}',
    editedChip: 'edited',
    editedTooltipBy: 'Edited: {name} ({role}), {date}',
    editedTooltipAt: 'Edited: {date}',
    editDialogTitle: 'Correct quantity',
    editDialogWas: '{name} · was {qty} {unit}',
    editDialogNewLabel: 'New quantity, {unit}',
    editDialogHint: 'The change will be recorded with your name',
    editDialogErrorRange: 'Quantity cannot be negative',
    editDialogErrorFormat: 'Enter a number (up to 3 decimal places)',
    editDialogTooltip: 'Correct quantity',
    saved: 'Item updated',

    draftTitle: 'Inventory · {zone}',
    draftSaveDraft: 'Save draft',
    draftComplete: 'Complete inventory',
    draftSavedDraft: 'Draft saved',
    draftCompleted: 'Inventory completed',
    draftLoading: 'Loading…',
    draftNoItems: 'No inventoried products in this zone',

    zonesPickHint: 'Pick a zone to recount stock.',
    zonesEmpty: 'No zones available.',
    zoneCardLastLabel: 'Last inventory',
    lastNever: 'not counted yet',
    lastToday: 'today at {time}',
    lastYesterday: 'yesterday at {time}',
    lastAtDate: '{date} at {time}',

    dateToday: 'today, {time}',
    dateYesterday: 'yesterday, {time}',
    dateAt: '{date}, {time}',
    historyBackToZones: '← Zones',
    historyPageTitle: 'Inventories — {zone}',
    lockedToday: 'Inventory already done today',

    draftSaved: 'Saved',
    completedTodayAt: 'Zone inventory completed today at {time}',
    noItemsForZone: 'This zone has no products to count yet.',
    confirmCompleteTitle: 'Complete inventory',
    confirmCompleteBody: 'Complete inventory for zone «{zone}»? Values cannot be changed after saving.',
    confirmCompleteBtn: 'Complete',
    completedForZoneNotify: 'Inventory for zone «{zone}» completed',
    noPositions: 'No items',
    errorFillAll: 'Fill in every item',
    errorCheckValues: 'Please check entered values',
  },

  products: {
    pageTitle: 'Products',
    addProduct: 'Add product',
    editProduct: 'Edit product',
    newProduct: 'New product',
    empty: 'Nothing found',
    searchPlaceholder: 'Search (name, description, SKU, barcode)',
    filterCategoryAll: 'All categories',
    filterCategoryNone: 'No category',
    filterZoneAll: 'All zones',
    filterUnitAny: 'Any',
    filterUnitLabel: 'Unit',
    filterZoneLabel: 'Zone',
    filterCategoryLabel: 'Category',
    filterActiveLabel: 'Status',
    filterActiveAll: 'All',
    filterActiveActive: 'Active',
    filterActiveInactive: 'Inactive',
    filterInventoryLabel: 'Inventory',
    filterInventoryYes: 'Tracked',
    filterInventoryNo: 'Not tracked',
    filterPurchaseLabel: 'Purchasing',
    filterPurchaseYes: 'Purchasable',
    filterPurchaseNo: 'Not purchasable',

    columnName: 'Name',
    columnZones: 'Zones',
    columnStock: 'Stock',
    columnUnit: 'Unit',
    columnPrice: 'Price',
    columnTarget: 'Target',
    columnActions: 'Actions',

    targetTooltip: 'Optimal (minimum) stock — advisory, used for future purchase lists',
    noCategory: 'No category',
    inactiveCategoryTag: ' (inactive)',
    confirmDeactivateTitle: 'Deactivate product',
    confirmDeactivateBody: 'Deactivate «{name}»? The product stays in the system and remains in history.',
    confirmActivateTitle: 'Activate product',
    confirmActivateBody: 'Activate «{name}»?',
    savedNotify: 'Product saved',
    activatedNotify: 'Product activated',
    deactivatedNotify: 'Product deactivated',

    priceTooltipLastReceived: 'Last receiving: {date}',
    priceTooltipPerUnit: '{price} {sym} per {unit}',
    stockTotalLabel: 'Total',

    sectionMain: 'General',
    sectionIdentifiers: 'Identifiers',
    sectionZones: 'Zones',
    sectionUsage: 'Usage',
    sectionTargetStock: 'Target stock',
    targetStockHint: 'Does not affect inventory or balances. Used for future purchase lists.',

    fieldName: 'Name',
    fieldDescription: 'Description',
    fieldCategory: 'Category',
    fieldCategoryNone: 'No category',
    fieldBaseUnit: 'Base unit',
    fieldSku: 'Internal SKU',
    fieldBarcode: 'Barcode',
    fieldZones: 'Zones where used',
    fieldZonesPlaceholder: 'Choose zones',
    fieldMinQuantity: 'Minimum stock',
    fieldOptimalQuantity: 'Optimal stock',
    switchInventoryTracked: 'Track in inventory',
    switchPurchasable: 'Available for purchasing',
  },

  receivings: {
    pageTitle: 'Receivings',
    addReceiving: 'Add receiving',
    empty: 'No receivings yet. Click «Add receiving».',
    columnNumber: '#',
    columnDate: 'Date',
    columnSupplier: 'Supplier',
    columnPositions: 'Items',
    columnZones: 'Zones',
    columnTotal: 'Total',
    columnAuthor: 'Author',

    newTitle: 'New receiving',
    editTitle: 'Edit receiving',
    draftUnsaved: 'Draft · not saved',
    supplier: 'Supplier',
    supplierNone: 'Not selected',
    receivedAt: 'Received on',
    dateHintOwner: 'Owner can pick any date',
    dateHintManager: 'Not earlier than yesterday',
    dateTooOld: 'Date cannot be earlier than yesterday',

    itemsSection: 'Items',
    addItem: 'Add product',
    itemsEmpty: 'No products added yet. Click «Add product».',
    colProductDistribution: 'Product · distribution across zones',
    colTakenTotal: 'Received total',

    quantity: 'Quantity',
    cost: 'Cost',
    zonesLabel: 'Zones',
    zonesEmpty: 'No zones assigned to this product — nothing to distribute. Set zones in the product card.',

    progressPrefix: 'Distributed',
    progressOf: '/',
    progressRemaining: 'remaining {n}',
    progressOver: 'over by {n}',

    deliveryCost: 'Delivery cost',
    totalItems: 'Items',
    totalDelivery: 'Delivery',
    totalGrand: 'Total',

    saveButton: 'Save receiving',
    saveEditButton: 'Save changes',
    savingButton: 'Saving…',

    createdNotify: 'Receiving created',
    updatedNotify: 'Receiving updated',
    deletedNotify: 'Receiving deleted',

    editButton: 'Edit',
    deleteButton: 'Delete',
    confirmDeleteTitle: 'Delete receiving',
    confirmDeleteBody: 'Delete receiving {number}? This action cannot be undone.',
    detailTitle: 'Receiving {number}',
    metaNumber: 'Number',
    metaDate: 'Received on',
    metaSupplier: 'Supplier',
    metaCreatedAt: 'Created',
    metaAuthor: 'Author',
    metaPositions: 'Items',

    pickerTitle: 'Choose products',
    pickerAvailable: 'Available ({count})',
    pickerChosen: 'Chosen ({count})',
    pickerNothing: 'No products match the filters',
    pickerEmpty: 'Empty so far',
    pickerMoveAll: 'Move all',
    pickerMoveSelected: 'Move selected',
    pickerRemoveSelected: 'Remove selected',
    pickerRemoveAll: 'Remove all',
    pickerCategoryAll: 'All categories',
    pickerCategoryNone: 'No category',
    pickerZoneAll: 'All zones',

    positionsWord: '{n} items',
    completeSuffix: '{n} fully distributed',
    attentionSuffix: '{n} need attention',

    withoutCategory: 'No category',
  },

  disposals: {
    pageTitle: 'Disposals',
    addDisposal: 'Create disposal',
    empty: 'No disposals yet. Click «Create disposal».',
    newTitle: 'New disposal',
    zoneLabel: 'Zone',
    zoneSingle: 'Zone: {name}',
    zoneNoAccess: 'No zones available for your role.',
    productLabel: 'Product',
    productPlaceholder: 'Search…',
    productNoOptions: 'Nothing found',
    productEmptyZone: 'Choose a zone first',
    quantityLabel: 'Quantity',
    saveButton: 'Create disposal',
    createdNotify: 'Disposal created',
    addItem: 'Add product',
    itemsSection: 'Products',
    itemsEmpty: 'No products yet. Click «Add product».',
    columnSkuCount: '{n} SKU',
    columnAuthor: 'Author',
    groupToday: 'Today',
    groupYesterday: 'Yesterday',
    filterDateFrom: 'From',
    filterDateTo: 'To',
    filterZoneAll: 'All zones',
    filterRole: 'Author role',
    filterRoleAll: 'Any role',
    deleteButton: 'Delete',
    deleteConfirmTitle: 'Delete disposal',
    deleteConfirmBody: 'Delete this disposal? This action cannot be undone.',
    deletedNotify: 'Disposal deleted',
  },

  units: {
    PIECE: 'pcs',
    GRAM: 'g',
    KILOGRAM: 'kg',
    MILLILITER: 'ml',
    LITER: 'l',
    PACK: 'pk',
    BOX: 'box',
    BOTTLE: 'btl',
    CAN: 'can',
    BAG: 'bag',
  },
};
