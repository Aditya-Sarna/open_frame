export const SAMPLE_COPYBOOK = `       01  CUSTOMER-RECORD.
           05  CUST-ID            PIC 9(8).
           05  CUST-NAME          PIC X(30).
           05  CUST-ADDRESS.
               10  STREET         PIC X(40).
               10  CITY           PIC X(20).
               10  STATE          PIC X(2).
               10  ZIP            PIC 9(5).
           05  ACCOUNT-BALANCE    PIC S9(9)V99 COMP-3.
           05  LAST-ACTIVITY-DATE PIC 9(8).
           05  ACCOUNT-TYPE       PIC X(1).
               88  CHECKING       VALUE 'C'.
               88  SAVINGS        VALUE 'S'.
           05  CREDIT-LIMIT       PIC S9(7)V99 COMP-3.
           05  FILLER             PIC X(10).
`;

export const SAMPLE_ROWS = [
    {
        cust_id: 10034821,
        cust_name: "ACME INDUSTRIES LLC",
        street: "500 CAPITOL DRIVE",
        city: "HOUSTON",
        state: "TX",
        zip: "77002",
        account_balance: 284531.22,
        last_activity_date: "2025-11-18",
        account_type: "C",
        credit_limit: 500000.0,
    },
    {
        cust_id: 10034822,
        cust_name: "NORTHERN LIGHTS COOP",
        street: "14 ARCTIC WAY",
        city: "ANCHORAGE",
        state: "AK",
        zip: "99501",
        account_balance: -1243.19,
        last_activity_date: "2025-12-01",
        account_type: "S",
        credit_limit: 25000.0,
    },
    {
        cust_id: null,
        cust_name: "  ORPHAN RECORD\u0085",
        street: "",
        city: "???",
        state: "ZZ",
        zip: "00000",
        account_balance: 12.5,
        last_activity_date: "20251303",
        account_type: "X",
        credit_limit: 0,
    },
];
