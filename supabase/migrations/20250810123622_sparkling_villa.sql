/*
  # Add Full Team Members for All Committees

  1. Team Members Added
    - Technical Team: 6 members (Lead, Frontend, Backend, Mobile, DevOps, UI/UX)
    - Creative Team: 5 members (Lead, Graphic Designer, Video Editor, Content Writer, Social Media)
    - Event Management: 4 members (Lead, Coordinator, Logistics, Volunteer Manager)
    - Marketing Team: 4 members (Lead, Digital Marketing, PR Manager, Brand Manager)
    - Finance Team: 3 members (Lead, Treasurer, Auditor)
    - Security Team: 3 members (Lead, Cyber Security, Physical Security)
    - Media Team: 4 members (Lead, Photographer, Videographer, Live Streaming)
    - Hospitality Team: 3 members (Lead, Guest Relations, Catering Coordinator)
    - Logistics Team: 4 members (Lead, Transport, Equipment, Venue Manager)
    - Documentation Team: 3 members (Lead, Content Manager, Archive Manager)

  2. Member Details
    - Each member has complete profile information
    - Professional headshot images from Pexels
    - Detailed role descriptions and specialties
    - Key achievements for each member
    - Proper ordering within committees

  3. Security
    - All members are enabled by default
    - Proper committee associations maintained
*/

-- Technical Team Members (Committee ID: 1)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(101, 1, 'Alex Chen', 'Technical Lead', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', 'Leading the technical vision and architecture for RICORRENZA 2025. Expert in full-stack development and system design.', 'Full-Stack Architecture', ARRAY['Led development of 5+ major web applications', 'Expert in React, Node.js, and cloud technologies', 'Mentored 20+ junior developers'], 1, true),
(102, 1, 'Sarah Johnson', 'Frontend Developer', 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400', 'Creating stunning user interfaces and seamless user experiences for the festival platform.', 'Frontend Development', ARRAY['Specialized in React and modern CSS frameworks', 'Created award-winning UI designs', 'Performance optimization expert'], 2, true),
(103, 1, 'Michael Rodriguez', 'Backend Developer', 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400', 'Building robust server-side solutions and database architectures for scalable festival management.', 'Backend Systems', ARRAY['Expert in Node.js and database design', 'Built high-performance APIs', 'Security and scalability specialist'], 3, true),
(104, 1, 'Emily Wang', 'Mobile Developer', 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400', 'Developing cross-platform mobile applications for enhanced festival experience.', 'Mobile Development', ARRAY['React Native and Flutter expert', 'Published 3+ mobile apps', 'Mobile UX optimization specialist'], 4, true),
(105, 1, 'David Kim', 'DevOps Engineer', 'https://images.pexels.com/photos/2182975/pexels-photo-2182975.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing cloud infrastructure and deployment pipelines for reliable festival operations.', 'Cloud Infrastructure', ARRAY['AWS and Docker containerization expert', 'Automated CI/CD pipeline implementation', 'System monitoring and optimization'], 5, true),
(106, 1, 'Lisa Thompson', 'UI/UX Designer', 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400', 'Designing intuitive and engaging user experiences for all festival digital touchpoints.', 'User Experience Design', ARRAY['Award-winning UI/UX designer', 'User research and testing expert', 'Accessibility and inclusive design advocate'], 6, true);

-- Creative Team Members (Committee ID: 2)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(201, 2, 'Maya Patel', 'Creative Director', 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400', 'Leading the creative vision and artistic direction for RICORRENZA 2025 cyberpunk theme.', 'Creative Direction', ARRAY['Led creative campaigns for 10+ major events', 'Award-winning graphic design portfolio', 'Brand identity and visual storytelling expert'], 1, true),
(202, 2, 'James Wilson', 'Graphic Designer', 'https://images.pexels.com/photos/2182969/pexels-photo-2182969.jpeg?auto=compress&cs=tinysrgb&w=400', 'Creating stunning visual assets and cyberpunk-themed designs for all festival materials.', 'Graphic Design', ARRAY['Adobe Creative Suite master', 'Cyberpunk and futuristic design specialist', 'Created visual identity for 15+ brands'], 2, true),
(203, 2, 'Sophia Martinez', 'Video Editor', 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400', 'Producing dynamic video content and promotional materials for the festival.', 'Video Production', ARRAY['Professional video editing and motion graphics', 'Created viral promotional videos', 'Expert in After Effects and Premiere Pro'], 3, true),
(204, 2, 'Ryan O''Connor', 'Content Writer', 'https://images.pexels.com/photos/2182973/pexels-photo-2182973.jpeg?auto=compress&cs=tinysrgb&w=400', 'Crafting compelling content and cyberpunk narratives for all festival communications.', 'Content Creation', ARRAY['Published author and copywriter', 'SEO and digital content expert', 'Created content for 50+ campaigns'], 4, true),
(205, 2, 'Zoe Anderson', 'Social Media Manager', 'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing social media presence and digital engagement strategies for the festival.', 'Social Media Strategy', ARRAY['Grew social media following by 300%', 'Viral content creation specialist', 'Community management expert'], 5, true);

-- Event Management Team Members (Committee ID: 3)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(301, 3, 'Kevin Zhang', 'Event Manager', 'https://images.pexels.com/photos/2182974/pexels-photo-2182974.jpeg?auto=compress&cs=tinysrgb&w=400', 'Overseeing all event planning and execution for a seamless festival experience.', 'Event Planning', ARRAY['Managed 25+ large-scale events', 'Expert in event logistics and coordination', 'Crisis management and problem-solving specialist'], 1, true),
(302, 3, 'Amanda Foster', 'Event Coordinator', 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400', 'Coordinating between different teams and ensuring smooth event operations.', 'Event Coordination', ARRAY['Coordinated events for 1000+ participants', 'Multi-team collaboration expert', 'Timeline and resource management specialist'], 2, true),
(303, 3, 'Carlos Mendez', 'Logistics Coordinator', 'https://images.pexels.com/photos/2182971/pexels-photo-2182971.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing venue logistics, equipment, and operational requirements for all events.', 'Logistics Management', ARRAY['Streamlined logistics for major events', 'Vendor management and negotiation expert', 'Cost optimization and efficiency specialist'], 3, true),
(304, 3, 'Rachel Green', 'Volunteer Manager', 'https://images.pexels.com/photos/3184340/pexels-photo-3184340.jpeg?auto=compress&cs=tinysrgb&w=400', 'Recruiting, training, and managing volunteers for the festival operations.', 'Volunteer Management', ARRAY['Managed teams of 100+ volunteers', 'Training and development specialist', 'Community engagement expert'], 4, true);

-- Marketing Team Members (Committee ID: 4)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(401, 4, 'Jessica Liu', 'Marketing Director', 'https://images.pexels.com/photos/3184341/pexels-photo-3184341.jpeg?auto=compress&cs=tinysrgb&w=400', 'Developing comprehensive marketing strategies to promote RICORRENZA 2025 across all channels.', 'Marketing Strategy', ARRAY['Increased event attendance by 200%', 'Digital marketing campaign expert', 'Brand positioning and market research specialist'], 1, true),
(402, 4, 'Tom Bradley', 'Digital Marketing Specialist', 'https://images.pexels.com/photos/2182972/pexels-photo-2182972.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing online marketing campaigns and digital advertising for maximum reach.', 'Digital Marketing', ARRAY['Google Ads and Facebook Marketing certified', 'ROI optimization expert', 'Data-driven marketing specialist'], 2, true),
(403, 4, 'Nina Sharma', 'PR Manager', 'https://images.pexels.com/photos/3184343/pexels-photo-3184343.jpeg?auto=compress&cs=tinysrgb&w=400', 'Building relationships with media and managing public relations for the festival.', 'Public Relations', ARRAY['Secured coverage in 50+ media outlets', 'Crisis communication expert', 'Influencer partnership specialist'], 3, true),
(404, 4, 'Chris Evans', 'Brand Manager', 'https://images.pexels.com/photos/2182976/pexels-photo-2182976.jpeg?auto=compress&cs=tinysrgb&w=400', 'Maintaining brand consistency and developing brand partnerships for the festival.', 'Brand Management', ARRAY['Developed brand guidelines for major events', 'Partnership negotiation expert', 'Brand identity and positioning specialist'], 4, true);

-- Finance Team Members (Committee ID: 5)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(501, 5, 'Robert Johnson', 'Finance Director', 'https://images.pexels.com/photos/2182977/pexels-photo-2182977.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing festival budget, financial planning, and ensuring fiscal responsibility.', 'Financial Management', ARRAY['CPA with 10+ years experience', 'Managed budgets exceeding $500K', 'Financial planning and analysis expert'], 1, true),
(502, 5, 'Grace Kim', 'Treasurer', 'https://images.pexels.com/photos/3184344/pexels-photo-3184344.jpeg?auto=compress&cs=tinysrgb&w=400', 'Handling day-to-day financial operations and expense tracking for the festival.', 'Financial Operations', ARRAY['Expert in financial software and systems', 'Expense management and reporting specialist', 'Audit and compliance expert'], 2, true),
(503, 5, 'Daniel Lee', 'Financial Auditor', 'https://images.pexels.com/photos/2182978/pexels-photo-2182978.jpeg?auto=compress&cs=tinysrgb&w=400', 'Ensuring financial transparency and conducting audits for festival operations.', 'Financial Auditing', ARRAY['Certified Internal Auditor', 'Risk assessment and mitigation expert', 'Compliance and regulatory specialist'], 3, true);

-- Security Team Members (Committee ID: 6)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(601, 6, 'Marcus Thompson', 'Security Director', 'https://images.pexels.com/photos/2182979/pexels-photo-2182979.jpeg?auto=compress&cs=tinysrgb&w=400', 'Overseeing all security aspects of the festival including cyber and physical security.', 'Security Management', ARRAY['15+ years in security management', 'Certified Security Professional', 'Emergency response and crisis management expert'], 1, true),
(602, 6, 'Elena Volkov', 'Cyber Security Specialist', 'https://images.pexels.com/photos/3184345/pexels-photo-3184345.jpeg?auto=compress&cs=tinysrgb&w=400', 'Protecting digital assets and ensuring cybersecurity for all festival systems.', 'Cybersecurity', ARRAY['Certified Ethical Hacker', 'Prevented 100+ security incidents', 'Penetration testing and vulnerability assessment expert'], 2, true),
(603, 6, 'Jake Morrison', 'Physical Security Lead', 'https://images.pexels.com/photos/2182980/pexels-photo-2182980.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing on-site security operations and ensuring participant safety.', 'Physical Security', ARRAY['Former law enforcement officer', 'Crowd control and event security expert', 'Emergency medical response certified'], 3, true);

-- Media Team Members (Committee ID: 7)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(701, 7, 'Isabella Garcia', 'Media Director', 'https://images.pexels.com/photos/3184346/pexels-photo-3184346.jpeg?auto=compress&cs=tinysrgb&w=400', 'Leading media coverage and documentation of all festival events and activities.', 'Media Production', ARRAY['Award-winning documentary filmmaker', 'Covered 30+ major events', 'Media strategy and content planning expert'], 1, true),
(702, 7, 'Nathan Cooper', 'Lead Photographer', 'https://images.pexels.com/photos/2182981/pexels-photo-2182981.jpeg?auto=compress&cs=tinysrgb&w=400', 'Capturing the essence and energy of RICORRENZA through professional photography.', 'Event Photography', ARRAY['Professional photographer for 8+ years', 'Specialized in event and portrait photography', 'Published in major photography magazines'], 2, true),
(703, 7, 'Olivia Brown', 'Videographer', 'https://images.pexels.com/photos/3184347/pexels-photo-3184347.jpeg?auto=compress&cs=tinysrgb&w=400', 'Creating dynamic video content and live coverage of festival highlights.', 'Video Production', ARRAY['Produced videos with 1M+ views', 'Live streaming and broadcast expert', 'Drone photography and aerial videography certified'], 3, true),
(704, 7, 'Tyler Davis', 'Live Streaming Coordinator', 'https://images.pexels.com/photos/2182982/pexels-photo-2182982.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing live streaming operations and real-time broadcast of festival events.', 'Live Broadcasting', ARRAY['Managed live streams for 50+ events', 'Multi-platform streaming expert', 'Technical broadcast and AV specialist'], 4, true);

-- Hospitality Team Members (Committee ID: 8)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(801, 8, 'Hannah Wilson', 'Hospitality Director', 'https://images.pexels.com/photos/3184348/pexels-photo-3184348.jpeg?auto=compress&cs=tinysrgb&w=400', 'Ensuring exceptional guest experience and hospitality services throughout the festival.', 'Hospitality Management', ARRAY['Hospitality industry veteran with 12+ years', 'Guest satisfaction rating of 98%', 'Event hospitality and VIP services expert'], 1, true),
(802, 8, 'Andrew Miller', 'Guest Relations Manager', 'https://images.pexels.com/photos/2182983/pexels-photo-2182983.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing guest services and ensuring positive experiences for all festival attendees.', 'Guest Services', ARRAY['Customer service excellence award winner', 'Multilingual communication specialist', 'Conflict resolution and guest satisfaction expert'], 2, true),
(803, 8, 'Chloe Taylor', 'Catering Coordinator', 'https://images.pexels.com/photos/3184349/pexels-photo-3184349.jpeg?auto=compress&cs=tinysrgb&w=400', 'Coordinating food and beverage services for participants and guests.', 'Catering Management', ARRAY['Managed catering for events with 2000+ attendees', 'Dietary restrictions and nutrition expert', 'Vendor management and quality control specialist'], 3, true);

-- Logistics Team Members (Committee ID: 9)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(901, 9, 'Brandon Clark', 'Logistics Director', 'https://images.pexels.com/photos/2182984/pexels-photo-2182984.jpeg?auto=compress&cs=tinysrgb&w=400', 'Overseeing all logistical operations and ensuring smooth execution of festival activities.', 'Operations Management', ARRAY['Supply chain and logistics expert', 'Reduced operational costs by 25%', 'Process optimization and efficiency specialist'], 1, true),
(902, 9, 'Samantha White', 'Transport Coordinator', 'https://images.pexels.com/photos/3184350/pexels-photo-3184350.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing transportation arrangements for participants, guests, and equipment.', 'Transportation Logistics', ARRAY['Coordinated transport for 5000+ participants', 'Route optimization and scheduling expert', 'Fleet management and safety specialist'], 2, true),
(903, 9, 'Jordan Martinez', 'Equipment Manager', 'https://images.pexels.com/photos/2182985/pexels-photo-2182985.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing technical equipment, audio-visual systems, and festival infrastructure.', 'Equipment Management', ARRAY['AV equipment and technical setup expert', 'Inventory management specialist', 'Equipment maintenance and troubleshooting expert'], 3, true),
(904, 9, 'Ashley Johnson', 'Venue Manager', 'https://images.pexels.com/photos/3184351/pexels-photo-3184351.jpeg?auto=compress&cs=tinysrgb&w=400', 'Coordinating venue arrangements and space management for all festival activities.', 'Venue Coordination', ARRAY['Managed 20+ venue setups', 'Space planning and layout optimization expert', 'Vendor coordination and facility management specialist'], 4, true);

-- Documentation Team Members (Committee ID: 10)
INSERT INTO core_team_members (id, committee_id, name, role, image, description, specialty, achievements, order_position, enabled) VALUES
(1001, 10, 'Victoria Chang', 'Documentation Lead', 'https://images.pexels.com/photos/3184352/pexels-photo-3184352.jpeg?auto=compress&cs=tinysrgb&w=400', 'Leading documentation efforts and maintaining comprehensive records of festival activities.', 'Documentation Management', ARRAY['Technical writing and documentation expert', 'Created comprehensive documentation systems', 'Information architecture and knowledge management specialist'], 1, true),
(1002, 10, 'Lucas Brown', 'Content Manager', 'https://images.pexels.com/photos/2182986/pexels-photo-2182986.jpeg?auto=compress&cs=tinysrgb&w=400', 'Managing content creation and maintaining festival knowledge base and archives.', 'Content Management', ARRAY['Content strategy and CMS expert', 'Digital asset management specialist', 'SEO and content optimization expert'], 2, true),
(1003, 10, 'Megan Davis', 'Archive Manager', 'https://images.pexels.com/photos/3184353/pexels-photo-3184353.jpeg?auto=compress&cs=tinysrgb&w=400', 'Maintaining historical records and creating archives for future festival references.', 'Archive Management', ARRAY['Digital archiving and preservation expert', 'Database management and organization specialist', 'Historical research and documentation expert'], 3, true);