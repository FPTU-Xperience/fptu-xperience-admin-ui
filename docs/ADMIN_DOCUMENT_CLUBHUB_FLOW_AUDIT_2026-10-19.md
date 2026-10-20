# Đối chiếu Admin UI, tài liệu triển khai và ClubHub UI

> Bản audit trước triển khai. Sau yêu cầu bổ sung trang, xem [kết quả triển khai và audit cập nhật](ADMIN_FULL_AUDIT_IMPLEMENTATION_2026-10-19.md). Trang Hệ số cộng điểm đã được gỡ theo yêu cầu; các mô tả của trang đó bên dưới là bằng chứng lịch sử. Đính chính A12: GET clubs và establishment applications hiện trả array, không áp dụng pageSize do FE gửi; giới hạn trang đầu đã xác nhận ở user directory, không suy diễn cho hai danh sách CLB này.

Ngày: 19/10/2026. Phạm vi: source hiện tại, bao gồm thay đổi chưa commit. Admin HEAD `0326552`, ClubHub HEAD `82e5e63`, documentation HEAD `e8ca492`. Đây là đánh giá UI, payload và điều hướng; không phải kiểm thử tài khoản thật, database, phân quyền BE hay nghiệm thu deployment. Không sửa nghiệp vụ trong đợt đánh giá này.

## 1. Kết luận

**Admin UI có nền tảng quản trị và nhiều API consumer, nhưng chưa đáp ứng đầy đủ tài liệu sản phẩm; các flow xuyên Admin–ClubHub chưa khép kín.** Điểm thiếu chính là roster/chuyển kỳ, duyệt kế hoạch và quyết toán hoạt động, referral tự khai qua BOD tới SA, bonus raw và vòng đời lãnh đạo. Mô hình chính sách điểm, phạm vi học kỳ và quyền System Admin còn lệch giữa các màn.

**Ưu tiên số 1 theo người dùng: thiếu trang Báo cáo để CTSV đọc báo cáo từ CLB và phê duyệt hoạt động.** `/ctsv/reports` hiện render màn phân tích gắn kết, nên thiếu ngay nơi tiếp nhận và xử lý báo cáo hằng ngày, trước cả phần quyết toán XP nâng cao. Đây là điểm đứt trực tiếp giữa CLB gửi hồ sơ ở ClubHub và CTSV nhận/xét duyệt ở Admin.

Phạm vi cần làm trước:

- Danh sách báo cáo từ CLB, lọc/tìm theo CLB, học kỳ, loại và trạng thái; phân trang server.
- Đọc nội dung, preview/download tệp, attachments, lịch sử và phản hồi. ClubHub hiện có các mẫu báo cáo tạo hoạt động, tổng kết hoạt động, đầu kỳ và cuối kỳ trong [report-templates](../../fptu-xperience-clubhub-ui/src/pages/v2/report-detail-page/report-templates.js).
- Hàng chờ hồ sơ xin tổ chức hoạt động và quyết định theo đúng hợp đồng/state machine: phê duyệt, từ chối hoặc yêu cầu sửa khi được hỗ trợ. Phân biệt generic FUTURE_EVENT report hiện có với activity-action application mới, không coi hai nguồn là cùng entity chỉ vì cùng mục đích nghiệp vụ.
- Sau quyết định server, CLB thấy trạng thái và phản hồi trên ClubHub, có đường sửa/gửi lại đúng loại hồ sơ; không tạo thêm một bước duyệt trùng.
- Bảng action/approved raw budget, completion report và posting XP được nối tiếp khi hợp đồng tương ứng đã có. Không trì hoãn màn đọc/duyệt báo cáo hiện hữu để chờ hoàn thiện toàn bộ roster hoặc scoring engine.

Không đánh đồng ba trường hợp:

- **Có consumer:** component thực sự gọi API. Chưa đồng nghĩa API production chạy đúng.
- **Có UI/contract:** có form, service method hoặc endpoint dự kiến, nhưng chưa có đầy đủ phía xử lý/đối ứng.
- **Chưa có flow:** không tìm thấy màn và chuỗi thao tác tương ứng trong phạm vi source đã đối chiếu.

## 2. Tài liệu dùng để so sánh

| Tài liệu | Cách áp dụng |
| --- | --- |
| [PRODUCT_REQUIREMENTS](../PRODUCT_REQUIREMENTS.md), [final-product baseline](../../fptu-xperience-doc/documents/final-product-baseline.md), [SRS FR-001–048](../../capstone-documents/report/draft/Report3_SRS_Draft_FPTU_Xperience.md) | Nền tảng phạm vi, phân vai, roster, raw/credited, self-declaration và audit. |
| [Decision register O-01–O-14](../../capstone-documents/report/draft/artifact.md) | Những quyết định còn mở không bị coi là thuật toán hoặc tiêu chí đã chốt. |
| [Activity action proposal 16/10](../../fptu-xperience-doc/feature-requests/activity-action-xp-approval-proposal.md) | Phần 1 ghi quyết định mới của chủ sản phẩm: action, tuyển staff, duyệt hai lần, chỉ ghi XP sau duyệt báo cáo. Entity/endpoint/status chi tiết vẫn là đề xuất kỹ thuật. Quyết định mới này thay quy tắc check-in tự credit trong baseline cũ đối với activity action. |
| [Specification index](../../fptu-xperience-doc/docs/specification-index.md), [semester management](../../fptu-xperience-doc/documents/semester-management.md), [normalization](../../fptu-xperience-doc/documents/point-normalization-layer.md) | Xác định độ ưu tiên và ranh giới; screen-flows cũ không phải acceptance scope mới. |
| [Admin baseline cũ](ADMIN_UI_BASELINE.md), [INTEGRATION](INTEGRATION.md), [FE–BE audit](../../fptu-xperience-doc/docs/fe-be-audit-2026-10-19.md) | Bằng chứng lịch sử, đọc lại source trước khi dùng. Không kế thừa kết luận “chưa có” từ báo cáo cũ nếu source đã thay đổi. |

**Xung đột tài liệu cần đồng bộ:** baseline/SRS còn viết check-in sinh award có hiệu lực; proposal 16/10 yêu cầu attendance/candidate trước, CTSV duyệt completion report rồi mới posting. Backlog triển khai activity phải theo quyết định mới, đồng thời sửa traceability SRS; không tự đổi flow self-declaration sang duyệt báo cáo hoạt động.

Theo baseline hiện tại, Admin sở hữu roster, học kỳ, scoring policy, system management và audit; ClubHub sở hữu nghiệp vụ quyết định SA. Proposal mới bổ sung phạm vi cả hai UI nhưng chưa chốt vị trí từng màn duyệt. Source hiện tại lại hướng người dùng sang Admin để xét duyệt. Cần chốt một nơi xử lý chính và deep link tới đúng hồ sơ; không tạo hai gate quyết định độc lập.

## 3. Admin hiện có gì trên 16 route

Route được xác nhận qua [routes/index.jsx](../src/routes/index.jsx) và [navigation](../src/routes/navigation.js).

| Route | Có trong source | Phần chưa đủ / chưa implement |
| --- | --- | --- |
| `/ctsv/overview` | Radar overview, danh sách user/club/application/quest/anomaly, export request. | KPI đếm từ các trang dữ liệu giới hạn; không phải roster/tổng hợp toàn trường. Chưa có tổng pending kế hoạch, quyết toán, rollover. |
| `/ctsv/declarations` | Queue phân trang, tải minh chứng riêng tư, approve/reject/request revision, verified attributes và version. | Không có referral BOD → SA hoặc nhập final raw; không gửi học kỳ đang chọn ở header. |
| `/ctsv/clubs` | CRUD CLB, category, queue đơn thành lập approve/reject. | Thiếu queue đóng CLB, thay chủ tịch, emergency nomination; không thấy consumer request-revision ở màn này. |
| `/ctsv/engagement` | Directory sinh viên/CLB, radar chi tiết, Excel export. | High/low cùng dựa vào có CLB; danh sách không theo roster học kỳ, không phải aggregate gắn kết có thẩm quyền. |
| `/ctsv/bonus-matrix` | CRUD đường hệ số theo ngưỡng. | Không phải cấp bonus raw cho CLB, không có balance/allocation/refund ledger. |
| `/ctsv/quests` | CRUD và publish/status quest qua `/api/v1/quests`. | Không phải activity staff recruitment cùng resource với ClubHub; không thay thế queue activity application/report. |
| `/ctsv/rubrics` | Benchmark CRUD/lock, policy read, draft/approval snapshot và xem versions. | Bộ trụ cột cũ, tổng weight 100%, bonusCap; chưa có editor coefficient/T7 theo target và khả năng xem policy đúng kỳ đang chọn. |
| `/ctsv/seasons` | CRUD metadata học kỳ và deadline báo cáo. | Không import/preview active roster, carry-forward, chạy/giám sát rollover, thống kê inactivity/succession/refund. |
| `/ctsv/anomalies` | Đọc anomalies và ledger từ namespace student-affairs. | Submit không gửi request, nút xác nhận disabled; chưa có flow quyết định bất thường trên server từ màn này. |
| `/ctsv/reports` | Render lại `Engagement reports`. | Không phải danh sách completion report hay màn xét duyệt quyết toán XP hoạt động. |
| `/admin/accounts` | CRUD, lock/unlock, Excel parse/validation và lặp create từng account. | Không phải roster import; thiếu server preview/commit và phục hồi lỗi từng dòng khi create thất bại. Danh sách chỉ tải trang đầu 500. |
| `/admin/roles` | Ma trận mô tả, role counts, verification assignment CRUD/version. | Ma trận tĩnh không phản ánh chính xác quyền frontend; account ADMIN vẫn vào được `/ctsv/*`. Assignment không thay cho membership/office hoặc SA gate. |
| `/admin/integrations` | Đọc/lưu integration settings. | Lưu URL/domain không chứng minh connector/SSO/external sync đã chạy. Lỗi load chỉ console, còn giá trị mặc định. |
| `/admin/settings` | Đọc/lưu settings. | Không thấy load error/retry chặn lưu mặc định khi API lỗi; chưa chứng minh protected-action provenance. |
| `/admin/health` | Aggregate health stats. | Badge từng service dựa vào có chuỗi URL, không dựa vào probe response; không phải health check thật của rollover/ledger. |
| `/admin/audit` | Đọc audit events, search/filter/pagination local. | Chưa có màn reconcile theo import batch, carry-forward, policy, raw-versus-credited, rollover job và correction chain; không tải các trang server tiếp theo. |

## 4. Các phát hiện và việc cần triển khai

### A01 — Chưa có quản lý active roster theo học kỳ · P0

**Yêu cầu:** FR-028–029. SA import danh sách đang học, preview additions/omissions/identifiers, lỗi từng dòng; phân biệt import mới và carry-forward.

**Bằng chứng:** [Seasons](../src/pages/seasons/Seasons.jsx) chỉ metadata/deadlines; [Accounts importRows](../src/pages/accounts/Accounts.jsx#L714) gọi `api.users.create` từng dòng; [API seasons](../src/services/api.js#L468) chỉ list/active/create/update. Không thấy màn hay request roster/carry-forward trong Admin.

**Ảnh hưởng ClubHub:** không có dữ liệu authoritative để hiển thị active/inactive, xác định quyền học kỳ hoặc tìm người kế nhiệm còn đang học. Excel tạo account không thay thế roster.

**TODO:** hợp đồng preview/commit/result theo semester và identity, additions/omissions, provenance; chốt O-04. Chỉ đánh dấu xong khi ClubHub nhận được trạng thái roster tương ứng sau import/carry-forward.

### A02 — Chưa có chuyển kỳ và chuỗi succession/pause/Not Held/refund · P0

**Yêu cầu:** FR-005–006, FR-019–020, FR-030–035.

**Bằng chứng:** không có route rollover/nomination ở Admin. ClubHub [WorkspaceSemesterContext](../../fptu-xperience-clubhub-ui/src/pages/v2/club-workspace-page/WorkspaceSemesterContext.jsx) chỉ chọn context; [MemberManagement](../../fptu-xperience-clubhub-ui/src/pages/v2/club-workspace-page/tabs/members/MemberManagement.jsx#L238) chỉ mở governance preview trong DEV. [MyClubsPage](../../fptu-xperience-clubhub-ui/src/pages/v2/my-clubs-page/MyClubsPage.jsx#L49) mở lời mời membership, không phải chấp nhận emergency presidency.

**TODO:** preview tác động/chạy job/xem lỗi và retry; consecutive inactivity, acting vice → promotion, pause, đánh dấu Not Held và refund đúng một lần; nominee query chỉ active roster, nominee accept rồi mới membership/office/reactivation. Giữ lịch sử. Chốt O-04/05/08/09 trước chi tiết edge cases.

### A03 — Action application phía ClubHub không có màn duyệt đối ứng · P0

**Yêu cầu:** FR-008–010 và proposal 16/10, lần duyệt thứ nhất.

**Bằng chứng:** ClubHub [ActivityApplicationPage](../../fptu-xperience-clubhub-ui/src/pages/v2/activity-application/ActivityApplicationPage.jsx#L201) save/submit; [applicationPayload](../../fptu-xperience-clubhub-ui/src/pages/v2/activity-application/activity-application-data.js#L165) chứa action/headcount/limits/recruitment. Admin route tree không có activity application queue; `Clubs` xét đơn thành lập CLB, `DeclarationsQueue` xét tự khai, không phải hồ sơ này.

**TODO:** queue/detail/review approve/reject/request revision, suggested budget/action changes đúng version; snapshot raw budget/policy; tạo activity chưa công khai sau approve. Hợp đồng đang thiếu trong source BE theo audit cùng ngày: [activity-action-staffing-api](../../fptu-xperience-clubhub-ui/docs/contracts/activity-action-staffing-api.md). Không chỉ thêm nút Admin gọi một URL dự kiến rồi coi flow đã xong.

**Hoạt động cấp trường (FR-011) cũng thiếu:** ClubHub [AffairsPage](../../fptu-xperience-clubhub-ui/src/pages/v2/affairs-page/AffairsPage.jsx) chỉ có thông báo chưa khả dụng và link danh sách hoạt động; Admin không có màn SA tạo/publish hoạt động không gắn CLB với raw budget riêng. Generic quest creation không đáp ứng trường hợp này.

**Publication chưa khớp đầy đủ proposal:** [ActivityPublicationControl](../../fptu-xperience-clubhub-ui/src/pages/v2/club-workspace-page/tabs/activities/ActivityPublicationControl.jsx) có cả legacy publish toggle và branch publicationStatus mới. Branch mới chỉ DRAFT→PUBLISH và PUBLISHED→CLOSE, không có thao tác unpublish cho PUBLISHED/CLOSED. CLOSE giữ hiển thị và đóng đăng ký; không thay cho quyền ẩn công khai được xác nhận trong proposal. Cần xử lý theo model BE, không gỡ toàn bộ publication control đang có.

### A04 — Chưa có completion report → lần duyệt thứ hai → posting XP · P0

**Bằng chứng:** `/ctsv/reports` dùng `Engagement reports`, không có award snapshot. ClubHub có [ReportDetailPage](../../fptu-xperience-clubhub-ui/src/pages/v2/report-detail-page/ReportDetailPage.jsx#L603) review/approve report hiện hữu, nhưng request chỉ report ID/note, không có candidate award snapshot/posting version. [QuestsTab](../../fptu-xperience-clubhub-ui/src/pages/v2/club-workspace-page/tabs/QuestsTab.jsx) đã mô tả “CTSV duyệt báo cáo kết thúc”; chưa có màn đối ứng cho chuỗi đó.

Không kết luận “ClubHub không có duyệt báo cáo”: generic report có; **generic report approval không chứng minh đã quyết toán action XP**. [ClubExperiencePanel](../../fptu-xperience-clubhub-ui/src/pages/v2/club-workspace-page/tabs/ClubExperiencePanel.jsx) tạo PDF snapshot thống kê cũng không phải completion report quyết toán.

**TODO:** report tự sinh từ attendance/completion/assignment; sửa thuyết minh được phép; validate budget/caps; approve/reject/revision theo report+award snapshot; theo dõi APPROVED/PENDING/POSTED/FAILED và retry posting. Bốn số độc lập: XP đề xuất/được duyệt/chờ quyết toán/đã ghi nhận. Không credit candidate trước duyệt lần hai.

### A05 — Mô hình policy/categories khác nhau giữa Admin và ClubHub · P1

**Bằng chứng:** [Rubrics CAPABILITIES](../src/pages/rubrics/Rubrics.jsx#L29) có `ACAD, PROF, COMM, PHYS, GLOB, ETHI`; lưu weight tổng 100% và `bonusCap`. ClubHub [ExperienceAttributesForm](../../fptu-xperience-clubhub-ui/src/components/v2/experience/ExperienceAttributesForm.jsx) dùng `Academic, Research, Global, CultureSports, Community, Entrepreneurship, RealWorldWork`. Ngay trong Admin, form review declaration dùng bộ canonical 7 trụ, còn bảng label tự khai vẫn dùng 6 code cũ.

**Yêu cầu:** FR-042–047: coefficient chuyển raw→credited khác tham số saturation; +1 là RealWorldWork riêng với positive T7, không phải generic bonus cap. Policy có hiệu lực theo kỳ và không sửa credit cũ.

**Đã có:** [ExperiencePolicyPanel](../src/components/experience-policy-panel/ExperiencePolicyPanel.jsx) đọc policy/versions, mở draft và approve snapshot; không được ghi nhận là “chưa có versioning”. Tuy nhiên chỉ xác nhận P01–P06/basis/environment/scope/effectiveAt, không phải editor đầy đủ cho bộ tham số target.

**TODO:** một taxonomy và contract mapping canonical; tách editor coefficients, tau và T7; hiển thị snapshot đầy đủ trước approve; raw/credited/provenance rõ trên cả hai app. Không tự chốt hệ số hoặc công thức còn O-01/O-02/O-11. Sai khác công thức +1 ở source BE đã được nêu riêng trong audit FE–BE, không được sửa bằng đổi label UI.

### A06 — Học kỳ chọn ở header không điều khiển đồng nhất dữ liệu · P1

**Bằng chứng:** [DeclarationsQueue](../src/pages/declarations-queue/DeclarationsQueue.jsx#L52) chỉ gửi page/pageSize/status; không đọc Workspace season. [Rubrics](../src/pages/rubrics/Rubrics.jsx#L94) gọi global `getActive()` một lần và không refetch theo `season`. [Anomalies](../src/pages/anomalies/Anomalies.jsx#L35) list anomalies/ledger không semester. [Engagement](../src/pages/engagement/Engagement.jsx#L76) tải directory một lần; chỉ radar chi tiết dùng season.

ClubHub [workspace-semester-data](../../fptu-xperience-clubhub-ui/src/pages/v2/club-workspace-page/workspace-semester-data.js) có DEV `FA2026` và alias `FALL2026`, query activities theo khoảng ngày, reports theo reportPeriod; [ExperiencePanel](../../fptu-xperience-clubhub-ui/src/pages/v2/profile-page/ExperiencePanel.jsx#L33) cho nhập semesterId bằng text. Admin catalog dùng semesterCode như FALL2026. Đây là rủi ro context chưa thống nhất, không khẳng định mọi request đều đang sai mã vì catalog BE có thể cung cấp mapping.

**TODO:** canonical semester ID/catalog có scope an toàn cho từng actor; mapping/date range rõ; các màn phụ thuộc kỳ reset page/refetch, chống stale response. Màn không phụ thuộc kỳ cần nói rõ phạm vi thay vì tạo cảm giác đã lọc.

### A07 — System Admin đang được trình bày như có SA decision rights · P1

**Bằng chứng:** [canAccessPath/workspaceRoleFor](../src/utils/access.js#L8) cho ADMIN vào `/ctsv/*` và chuyển workspace role thành STUDENT_AFFAIRS_ADMIN; [Sidebar](../src/components/common/sidebar/Sidebar.jsx) có chuyển không gian. [RoleMatrix](../src/pages/role-matrix/RoleMatrix.jsx) lại mô tả quyền SA tách Admin. ClubHub [reportDetailAccess](../../fptu-xperience-clubhub-ui/src/pages/v2/report-detail-page/report-detail-data.js#L8) cũng cho `ADMIN` vào reviewer/finalReview; [affairs-access](../../fptu-xperience-clubhub-ui/src/pages/v2/affairs-access.js) cho Admin quan sát SA là hợp lý nếu chỉ đọc.

**Yêu cầu:** Admin không tự kế thừa quyền quyết định SA. Đây là lệch guard/presentation đã xác nhận; chưa kết luận BE cho phép vượt quyền.

**TODO:** tách quyền quan sát, SA quyết định, policy operator và verification capability. Người có cả hai role có thể vào cả hai; chỉ ADMIN không tự được SA approval. Kiểm thử negative trực tiếp API, không chỉ ẩn nút.

### A08 — Tự khai ngoài CLB có các bước API, nhưng referral và final raw còn thiếu · P0

**Match một phần:** ClubHub [ExternalDeclarationForm](../../fptu-xperience-clubhub-ui/src/components/v2/experience/ExternalDeclarationForm.jsx#L31) gửi ngoài CLB, category và evidence; Admin [DeclarationsQueue](../src/pages/declarations-queue/DeclarationsQueue.jsx#L103) review versioned với private evidence; không bắt sinh viên nhập proposed points.

**Thiếu:** không thấy form declaration trong CLB với membership/referral BOD → SA, optional recommended raw và SA chỉnh final category/raw. [ClubContributionSubmission](../../fptu-xperience-clubhub-ui/src/components/v2/experience/ClubContributionSubmission.jsx) là đóng góp theo activity session; [VerificationQueue](../../fptu-xperience-clubhub-ui/src/components/v2/experience/VerificationQueue.jsx) là assigned contribution verification. Hai thứ này không tự đáp ứng referral declaration.

Admin approval gửi `verifiedAttributes`, chưa có finalRawAmount; “điểm cuối do máy chủ tính” khác target SA chọn raw amount. ClubHub history dùng contribution/ledger/history, không thấy consumer own declaration list để quản lý queue/status của chính đơn `/api/v1/declarations`; cần xác minh bridge ID/status phía API trước khi coi vòng feedback/resubmit đã khép kín. Không khẳng định là hai database độc lập chỉ từ tên URL.

**TODO:** agreed contract riêng cho outside/in-club route, proposed/final values và referral provenance; chỉ SA final approval credit, không debit activity/bonus; history/feedback/resubmit theo đúng loại source. Không áp dụng approval completion report của activity cho declaration độc lập.

### A09 — Chưa có raw club bonus, allocation và đối soát wallet · P1

**Bằng chứng:** Admin `BonusMatrix` quản lý multiplier thresholds; source không có flow grant club raw balance hoặc allocate vào approved activity. ClubHub PointsTab chủ yếu mở assigned verification queue; profile có raw summary/ledger/radar và policy version, chưa chứng minh phân biệt raw input với credited output của target wallet.

**TODO:** grant amount/reason/period; available/allocated/refunded balances, activity-approved validation và SA inspection; tách raw ledger khỏi credited wallet. Finance endpoints và VNĐ trong generic report không thay thế raw XP budget. Gắn với A02/A04/A05, O-07.

### A10 — Thành lập CLB match một phần; closure/transfer chưa có UI đối ứng · P1

Admin [Clubs](../src/pages/clubs/Clubs.jsx#L124) approve/reject establishment bằng API thật. ClubHub legacy `/clubs` có [ClubsPage](../../fptu-xperience-clubhub-ui/src/pages/ClubsPage.jsx#L546) submit/update và review/revision; production V2 không thấy entrypoint tương đương cho đơn thành lập. Cần phân biệt legacy còn route với journey V2 đang dùng.

Admin service đã khai báo [disbandRequests/transferRequests](../src/services/api.js#L369), nhưng không tìm thấy consumer trong pages/components. Vì vậy không ghi “không có API client”; phần thiếu là UI queue/detail/decision và liên kết phía người nộp. Closure/ordinary transfer khác emergency nomination A02; chốt states O-06.

### A11 — Đối soát/điều chỉnh bị chia thành hai flow chưa đồng nhất · P2

Admin [Anomalies submit](../src/pages/anomalies/Anomalies.jsx#L63) là no-op; nút save disabled. ClubHub [ContributionDetails](../../fptu-xperience-clubhub-ui/src/components/v2/experience/ContributionDetails.jsx#L205) có CORRECT/REVOKE và effect history với version/idempotency. Đây là điều chỉnh một contribution được cấp quyền, không phải tự động resolve anomaly case.

**TODO:** quyết định rõ anomaly triage có cần writer riêng hay deep link sang correction; preserve source/reversal/reason/actor; refresh case và ledger sau kết quả server, xử lý conflict/retry. Không dựng ledger giả trong browser.

### A12 — Số liệu gắn kết và tổng quan có thể gây hiểu sai · P1

[Engagement](../src/pages/engagement/Engagement.jsx#L129): `high` và `low` cùng dùng `hasClub`; lowEngagementCount = mọi sinh viên có CLB. Nội dung lại nói “dưới ngưỡng XP của học kỳ”. Data chỉ lấy role CLUB_MEMBER từ `/api/users` trang đầu 500, không phải roster active của kỳ. [Dashboard](../src/pages/dashboard/Dashboard.jsx#L125) cũng đếm từ giới hạn 500 users/100 clubs/50 applications.

**TODO:** aggregate theo semester/campus/active roster và tiêu chí được chốt; server paging/total cho directory; bỏ phân loại suy từ membership. Cùng student/semester/policy phải đối chiếu được với profile/radar ClubHub, kể cả người có nhiều club roles.

### A13 — Excel account import mất lỗi runtime từng dòng · P2

[importRows](../src/pages/accounts/Accounts.jsx#L714) catch lỗi create từng account chỉ console, sau đó `setDone(true)` và toast `Đã nhập ${good.length}` trong khi created có thể ít hơn. Có validation local và resultCount, nhưng chưa có kết quả server per-row/retry cho các dòng thất bại. Không phải chưa có nhập Excel; vấn đề là kết quả partial success chưa trung thực/khôi phục được.

**TODO:** success/failed theo từng dòng, giữ dòng fail và thông báo theo số thực; preview/commit server khi contract được thống nhất. Không dùng flow này cho import roster A01.

### A14 — Health và settings chưa phản ánh đúng lỗi vận hành · P2

[SystemSettings](../src/pages/system-settings/SystemSettings.jsx#L170) gán badge “Hoạt động” nếu có `healthEndpoint`, không thực hiện probe đó. Load stats/settings lỗi chỉ console; mặc định có thể vẫn hiển thị/lưu. Có request save settings thật, nhưng chưa chứng minh SSO/timetable/rollover worker hoạt động.

**TODO:** unknown/loading/degraded/error từ server hoặc probe được cho phép; error/retry rõ và không lưu mặc định đè config chưa tải được. External timetable/sync vẫn O-13, không bị xếp là core gap nếu chưa nhận scope.

### A15 — Audit hiện tại chưa đáp ứng đối soát nghiệp vụ xuyên ứng dụng · P1

[Audit](../src/pages/audit/Audit.jsx#L21) tải audit-events rồi phân trang/lọc local, chưa có drill-down cho import/carry-forward, rollover result, policy snapshot, nguồn raw/credited và correction chain. Quyền audit chỉ trong `/admin/*`, cần xác định SA được xem provenance nào của tác vụ SA.

**TODO:** lọc server theo scope/time/semester/source/policy/job; liên kết operation ID giữa Admin và ClubHub; xem nguyên bản và reversal, không chỉ một chuỗi action/detail. Gắn với FR-035–041 và các module còn thiếu, không coi generic audit list là đủ nghiệm thu.

## 5. Ma trận các flow giữa hai UI

| Flow | ClubHub | Admin | Kết luận |
| --- | --- | --- | --- |
| Identity / actor | Auth và per-club access; SA observer. | API identity, guarded routes. | Cùng hệ API theo source; quyền ADMIN/SA bị trộn ở presentation. SSO/session liên origin chưa kiểm chứng và không phải tự động có chỉ vì cùng token model. |
| Thành lập CLB | Legacy form/queue/revision; V2 thiếu entrypoint tương đương. | Approve/reject establishment. | Khớp một phần; chưa phải journey V2 đầy đủ, revision Admin còn thiếu. |
| Đóng CLB / thay chủ tịch thường | Không thấy journey V2 đầy đủ. | Chỉ service methods, chưa có screen consumer. | Chưa khép kín. |
| Emergency succession | DEV governance preview; membership invitation khác nominee acceptance. | Không roster/nomination/rollover UI. | Chưa implement flow target. |
| Activity action plan | Form action + estimate + save/submit, còn contract BE gap. | Không review queue. | Đứt ở lần duyệt thứ nhất. |
| Staff recruitment | Workspace QuestsTab và activity detail dùng cùng ActivityStaffingPanel/API theo activity. | Quest CRUD độc lập `/api/v1/quests`. | ClubHub hai entry dùng cùng tài nguyên ở source; Admin quest không phải đối ứng của recruitment. |
| Publish | Có publication control/version; branch DRAFT→PUBLISH, PUBLISHED→CLOSE. | Không plan approval đối ứng. | Partial; CLOSE là đóng đăng ký, không đồng nghĩa unpublish như proposal. |
| Attendance / contribution | Session/check-in/manual request/assigned verification/adjustment. | Có assignment management; declaration review riêng. | Có nền tảng phối hợp grant→verification. Chưa chứng minh flow candidate→report approval→posting mới. |
| Completion report / XP posting | Generic report + PDF experience snapshot hiện hữu. | `/ctsv/reports` là Engagement. | Thiếu report quyết toán action và lần duyệt thứ hai. |
| Outside self-declaration | Form ngoài CLB + private evidence. | Queue/review versioned. | Khớp bước submit/review ở source; thiếu final raw và acceptance feedback/resubmit theo declaration source. |
| In-club self-declaration | Session contribution không phải declaration referral. | Không BOD referral provenance/final raw editor. | Chưa implement referral→SA final gate. |
| Semester | Workspace catalog/DEV fallback, free-text profile semester. | API catalog, CRUD, header selection. | Chưa đồng nhất catalog/scope; không rollover. |
| Policy→score→history | Canonical pillars, raw ledger/radar/+1/policy provenance. | Old benchmark taxonomy + snapshot approvals. | Chưa thống nhất model, coefficient/T7 và raw→credited boundary. |
| Raw club bonus | Không balance/allocation journey. | Multiplier matrix khác nghiệp vụ. | Chưa implement target. |
| Correction/anomaly | Contribution adjustment/reversal consumer. | Anomaly decision disabled. | Có consumer correction, chưa khớp anomaly workflow và audit chain. |
| Engagement/reporting | Student/club experience sources và reports. | Membership-based high/low, generic export. | Chưa có aggregate đối soát cùng phạm vi học kỳ/campus. |

## 6. Traceability yêu cầu và thứ tự triển khai

| Phạm vi yêu cầu | Đánh giá UI/flow hiện tại | Hạng mục |
| --- | --- | --- |
| FR-001–002 | Có auth/per-club foundations; quyền presentation cần sửa, enforcement chưa kiểm chứng. | A07 |
| FR-003–004 | Establishment partial, closure/transfer thiếu journey. | A10 |
| FR-005–006 | Chưa có emergency active-roster nomination/accept/reactivate. | A01–02 |
| FR-007 | Mobile ngoài hai UI được yêu cầu; không coi ClubHub là Mobile. | Theo dõi riêng |
| FR-008–010 | Action submission có UI; thiếu review counterpart. | A03 |
| FR-011 | ClubHub SA activities là placeholder, Admin không global activity creation. | TODO global source không club owner + raw budget |
| FR-012–013 | Chưa có grant/allocation raw bonus flow. | A09 |
| FR-014–018 | Có web registration/session/contribution/history; chưa có toàn bộ action settlement và Mobile. | A04/A09 |
| FR-019–020 | Chưa có pause→Not Held→refund flow. | A02 |
| FR-021–027 | Outside submit/review partial; thiếu in-club referral/final raw/closed feedback journey. | A08 |
| FR-028–035 | Metadata CRUD có; roster/rollover/lifecycle thiếu. | A01–02/A06 |
| FR-036–041 | Source detail/effects/correction có; credited wallet reconciliation chưa đủ. | A04/A09/A11/A15 |
| FR-042–048 | Snapshot/score reads có; taxonomy, parameter editor và semester linkage lệch. | A05–06 |
| Proposal 16/10 | Form action/staffing có; thiếu approval 1, completion report/approval 2, posting và unpublish đúng nghĩa. | A03–04 và publication follow-up |
| NFR-01–08 | Chỉ có bằng chứng source, chưa nghiệm thu integrity/security/consistency/privacy/a11y xuyên app. | Acceptance bên dưới |
| NFR-09–10 | Không đo performance/availability trong đợt audit này; mục tiêu định lượng còn mở. | O-14 |

Thứ tự đề nghị:

0. **Làm trang Báo cáo CTSV trước:** thay nội dung Engagement tại `/ctsv/reports` bằng inbox báo cáo CLB, đọc chi tiết/tệp/lịch sử và xử lý hồ sơ xin hoạt động; nối phản hồi về ClubHub. Tận dụng report API hiện hữu cho nguồn hiện hữu, ghi contract gap riêng cho activity-action approval mới. Đây là ưu tiên triển khai trực tiếp của người dùng.
1. Đồng bộ quyết định activity mới vào baseline/SRS; chốt nơi đặt SA decision UI, canonical taxonomy/semester và phân biệt ADMIN/SA/capability. Đây là dependency cho cả hai app.
2. Roster preview/import/carry-forward, rồi rollover/leadership/Not Held/refund; bổ sung contract cho phần thiếu trước UI viết dữ liệu thật.
3. Activity application review lần 1 → approved snapshot/unpublished activity → recruitment/attendance/action candidate → completion report review lần 2 → posting và reconciliation.
4. Declaration outside/in-club referral → SA final raw/category → student feedback/history. Tách source này khỏi action settlement.
5. Policy coefficient/tau/T7, raw bonus balances và wallet explanation, aggregate/audit; sửa high/low, partial-import messaging, health/load error.

Không tự đưa generic quest/reward shop, recommendations, timetable sync, portfolio sharing vào core acceptance. Staff recruitment thuộc activity đã được ghi nhận trong proposal mới. Recommendation homepage vừa được người dùng yêu cầu tắt; đó không phải regression cần bật lại.

## 7. Acceptance cần chạy sau implement

- Cùng sinh viên, CLB, semester, policy: Admin và ClubHub cho ra cùng trạng thái, số raw/credited, quyết định và provenance; đổi context không giữ kết quả cũ.
- Hai tài khoản/hai campus/hai CLB; ADMIN-only, SA-only, dual-role, BOD và expired verification grant; test direct request, self-review, cross-club denial.
- Import lỗi từng dòng/duplicate/omitted student; carry-forward không import; rollover retry không tăng inactivity hai lần, không promotion/refund trùng, history giữ nguyên.
- Plan sửa/resubmit, conflict version, approval tạo unpublished activity; publish/unpublish khác close registration.
- Check-in/completion retry không nhân candidate; report revision/reject không posting; approval/posting worker fail/retry cho số đúng và không credit sớm.
- Declaration BOD referral không credit; SA final approval một lần, không debit activity/bonus; sinh viên thấy feedback, final category/raw/credited và lịch sử sửa.
- Policy mới không rewrite lịch sử; sáu radar axes và +1 riêng; correction có reversal/actor/reason/original link.
- Đối chiếu server pagination/total và aggregate với dữ liệu vượt 500 users/100 clubs/50 applications; health unknown/error không hiện xanh giả.

## 8. Giới hạn xác minh

Đã đối chiếu route tree 16 route Admin, service boundary, các component nghiệp vụ liên quan và entrypoint legacy/V2 ClubHub. Các bằng chứng “không thấy consumer” được tìm trên `src`, không suy từ tên navigation hoặc chỉ một file. Service wrapper không được tính là màn đã triển khai; demo/DEV preview không được tính là production.

Không fetch/pull, không sửa logic FE/BE, không migration, không gửi quyết định nghiệp vụ, không chạy nghiệm thu live hoặc công thức BE. Các build/tests của lượt sửa trước không được tái sử dụng làm bằng chứng hoàn thành các flow trong báo cáo này. Đánh giá BE gap chỉ tham chiếu audit source cùng ngày và active contracts, không tuyên bố kiểm thử BE mới.
